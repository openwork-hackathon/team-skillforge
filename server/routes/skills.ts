import { Router, Request, Response } from "express";
import Skill from "../models/Skill";
import Install from "../models/Install";
import { authWallet, optionalAuth, AuthRequest } from "../middleware/auth";
import { hashContent, verifyPayment, getBalance } from "../lib/openwork";
import { ethers } from "ethers";

const router = Router();

// ─── GET /skills — Browse & search skills ───
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      q,
      category,
      sort = "popular",
      page = "1",
      limit = "20",
      pricing,
      compatibility,
    } = req.query;

    const filter: any = {};

    if (q) filter.$text = { $search: q as string };
    if (category && category !== "all") filter.category = category;
    if (pricing && pricing !== "all") filter["pricing.model"] = pricing;
    if (compatibility) filter.compatibility = { $in: (compatibility as string).split(",") };

    const sortMap: Record<string, any> = {
      popular: { "stats.installs": -1 },
      newest: { createdAt: -1 },
      rating: { "stats.rating": -1 },
      revenue: { "stats.revenue": -1 },
    };

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 50);

    const [skills, total] = await Promise.all([
      Skill.find(filter)
        .sort(sortMap[sort as string] || sortMap.popular)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select("-content") // don't send full SKILL.md in list view
        .lean(),
      Skill.countDocuments(filter),
    ]);

    res.json({
      skills,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /skills/featured — Featured/trending skills ───
router.get("/featured", async (_req: Request, res: Response) => {
  try {
    const [featured, trending, newest] = await Promise.all([
      Skill.find({ featured: true }).limit(6).select("-content").lean(),
      Skill.find().sort({ "stats.installs": -1 }).limit(6).select("-content").lean(),
      Skill.find().sort({ createdAt: -1 }).limit(6).select("-content").lean(),
    ]);
    res.json({ featured, trending, newest });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /skills/categories — Category stats ───
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await Skill.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 }, totalInstalls: { $sum: "$stats.installs" } } },
      { $sort: { count: -1 } },
    ]);
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /skills/:id — Skill detail ───
router.get("/:id", optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const skill = await Skill.findById(req.params.id).lean();
    if (!skill) return res.status(404).json({ error: "Skill not found" });

    // Check if requester has installed this skill
    let installed = false;
    if (req.wallet) {
      const install = await Install.findOne({
        skillId: skill._id,
        agentAddress: req.wallet,
      });
      installed = !!install;
    }

    // Only show full content if free, or if user has installed
    const showContent = skill.pricing.model === "free" || installed;

    res.json({
      ...skill,
      content: showContent ? skill.content : skill.content.slice(0, 500) + "\n\n--- 🔒 Install to view full SKILL.md ---",
      installed,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /skills — Publish a new skill ───
router.post("/", authWallet, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      symbol,
      description,
      category,
      content,
      pricing,
      compatibility,
      tags,
      version,
    } = req.body;

    if (!name || !symbol || !description || !category || !content) {
      return res.status(400).json({
        error: "Missing required fields",
        hint: "name, symbol, description, category, content are required",
      });
    }

    // Check publisher has minimum $OPENWORK balance
    const balance = await getBalance(req.wallet!);
    if (parseFloat(balance) < 100000) {
      return res.status(403).json({
        error: "Insufficient $OPENWORK balance",
        hint: "Need ≥100,000 $OPENWORK to publish. Current: " + balance,
      });
    }

    const contentHash = hashContent(content);

    const skill = await Skill.create({
      name,
      symbol: symbol.toUpperCase(),
      description,
      category,
      version: version || "1.0.0",
      content,
      contentHash,
      author: {
        address: req.wallet,
        name: req.body.authorName || `Agent-${req.wallet!.slice(0, 8)}`,
        avatar: req.body.authorAvatar,
      },
      pricing: pricing || { model: "free", amount: 0 },
      compatibility: compatibility || [],
      tags: tags || [],
    });

    res.status(201).json({
      skill,
      contentHash,
      message: "Skill published! Store contentHash on-chain for verification.",
      next_steps: [
        "Share your skill URL with other agents",
        "Track installs on your dashboard",
        "Update with PUT /skills/:id",
      ],
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Symbol already taken", hint: "Choose a different symbol" });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /skills/:id — Update a skill ───
router.put("/:id", authWallet, async (req: AuthRequest, res: Response) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ error: "Skill not found" });
    if (skill.author.address !== req.wallet) {
      return res.status(403).json({ error: "Not the author" });
    }

    const updates = req.body;
    if (updates.content) {
      updates.contentHash = hashContent(updates.content);
    }

    // Don't allow changing symbol or author
    delete updates.symbol;
    delete updates.author;
    delete updates.stats;

    const updated = await Skill.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /skills/:id/install — Install a skill (with payment verification) ───
router.post("/:id/install", authWallet, async (req: AuthRequest, res: Response) => {
  try {
    console.log(`[Install] Wallet: ${req.wallet}, Skill: ${req.params.id}`);
    console.log(`[Install] Body:`, req.body);

    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ error: "Skill not found" });

    // Check if already installed
    const existing = await Install.findOne({
      skillId: skill._id,
      agentAddress: req.wallet,
    });
    if (existing) {
      return res.json({
        message: "Already installed",
        content: skill.content,
        contentHash: skill.contentHash,
      });
    }

    // If paid skill with actual amount, verify payment tx
    if (skill.pricing.amount > 0) {
      const txHash = req.body?.txHash;
      if (!txHash) {
        return res.status(400).json({
          error: "Payment required",
          hint: `Send ${skill.pricing.amount} $OPENWORK to ${skill.author.address}, then include txHash`,
          amount: skill.pricing.amount,
          recipient: skill.author.address,
        });
      }

      const valid = await verifyPayment(
        txHash,
        req.wallet!,
        skill.author.address,
        ethers.parseEther(skill.pricing.amount.toString())
      );

      if (!valid) {
        return res.status(400).json({ error: "Payment verification failed", hint: "Ensure tx is confirmed and correct amount" });
      }
    }

    // Record install
    await Install.create({
      skillId: skill._id,
      agentAddress: req.wallet,
      txHash: req.body?.txHash || null,
      amountPaid: skill.pricing.amount,
    });

    // Update stats
    await Skill.findByIdAndUpdate(skill._id, {
      $inc: {
        "stats.installs": 1,
        "stats.revenue": skill.pricing.amount,
      },
    });

    res.json({
      message: "Skill installed!",
      content: skill.content,
      contentHash: skill.contentHash,
    });
  } catch (err: any) {
    console.error("[Install] Error:", err);
    if (err.code === 11000) {
      return res.json({ message: "Already installed" });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /skills/:id/rate — Rate a skill ───
router.post("/:id/rate", authWallet, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be 1-5" });
    }

    const install = await Install.findOne({
      skillId: req.params.id,
      agentAddress: req.wallet,
    });

    if (!install) {
      return res.status(403).json({ error: "Must install before rating" });
    }

    install.rating = rating;
    install.review = review;
    await install.save();

    // Recalculate average rating
    const agg = await Install.aggregate([
      { $match: { skillId: install.skillId, rating: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    if (agg.length > 0) {
      await Skill.findByIdAndUpdate(req.params.id, {
        "stats.rating": Math.round(agg[0].avg * 10) / 10,
        "stats.ratingCount": agg[0].count,
      });
    }

    res.json({ message: "Rating submitted", rating, review });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /skills/:id/reviews — Get reviews for a skill ───
router.get("/:id/reviews", async (req: Request, res: Response) => {
  try {
    const reviews = await Install.find({
      skillId: req.params.id,
      rating: { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("agentAddress rating review createdAt")
      .lean();

    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /dashboard — Publisher dashboard stats ───
router.get("/dashboard/stats", authWallet, async (req: AuthRequest, res: Response) => {
  try {
    const skills = await Skill.find({ "author.address": req.wallet }).lean();

    const totalInstalls = skills.reduce((sum, s) => sum + s.stats.installs, 0);
    const totalRevenue = skills.reduce((sum, s) => sum + s.stats.revenue, 0);
    const avgRating =
      skills.length > 0
        ? skills.reduce((sum, s) => sum + s.stats.rating, 0) / skills.length
        : 0;

    res.json({
      skills,
      stats: {
        totalSkills: skills.length,
        totalInstalls,
        totalRevenue,
        avgRating: Math.round(avgRating * 10) / 10,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;