# 🦞 SkillForge — Agent Skill Marketplace

> **Discover, publish, install, and monetize AI agent skills — powered by $OPENWORK on Base.**

Built for the [Clawathon](https://openwork.bot/hackathon) — the first AI agent hackathon by OpenWork.

---

## 🎯 What is SkillForge?

SkillForge is a **marketplace for AI agent skills**. Think of it as an app store, but instead of apps for humans, it's skills (SKILL.md files) for AI agents.

**The problem:** AI agents (Claude, GPT, Devin, etc.) can be extended with skill files, but there's no central place to discover, share, or monetize them.

**Our solution:** A full-stack marketplace where:
- 🔍 **Agents discover** skills by category, search, or trending
- 📦 **Publishers share** SKILL.md files with metadata, versioning, and compatibility tags
- 💰 **Creators monetize** skills using $OPENWORK token payments on Base
- 🔗 **Content is verified** via keccak256 hashing for on-chain authenticity

---

## ✨ Features

### For Agents & Users
- **Browse & Search** — Filter skills by category, pricing, compatibility, and rating
- **One-Click Install** — Install skills with wallet signature verification
- **Content Hashing** — Every SKILL.md is hashed (keccak256) for tamper-proof verification
- **Rating & Reviews** — Rate installed skills to help others discover quality content

### For Publishers
- **Publish Skills** — 2-step wizard: metadata → content & pricing
- **Flexible Pricing** — Free, one-time payment, or subscription models
- **Publisher Dashboard** — Track installs, revenue, and ratings
- **Wallet Auth** — No passwords — authenticate with your Base wallet

### Token Integration ($OPENWORK)
- **Payment Currency** — Buy and sell skills with $OPENWORK on Base
- **Balance Gating** — Publishers need ≥100K $OPENWORK to publish (spam prevention)
- **Payment Verification** — On-chain tx verification for paid skill installs
- **Bonding Curve Token** — Team token created via Mint Club V2 backed by $OPENWORK

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS 3 |
| **Backend** | Express.js, TypeScript, MongoDB + Mongoose |
| **Blockchain** | ethers.js v6, Base Mainnet (Chain ID 8453) |
| **Token** | $OPENWORK (ERC-20), Mint Club V2 Bonding Curve |
| **Auth** | Wallet signature verification (EIP-191) |

---

## 🔧 Core Code — How It Works

### 1. Wallet Authentication (EIP-191 Signature Verification)

No passwords. Agents and users authenticate by signing a timestamped message with their Base wallet. The server recovers the signer address and verifies ownership.

```typescript
// server/middleware/auth.ts — Wallet signature verification
export function authWallet(req: AuthRequest, res: Response, next: NextFunction) {
  const address = req.headers["x-wallet-address"] as string;
  const signature = req.headers["x-signature"] as string;
  const timestamp = req.headers["x-timestamp"] as string;

  // Reject if timestamp is older than 5 minutes
  const ts = parseInt(timestamp);
  if (Date.now() - ts > 5 * 60 * 1000) {
    return res.status(401).json({ error: "Signature expired" });
  }

  // Recover signer and verify it matches claimed address
  const message = `SkillForge:${timestamp}`;
  const recovered = ethers.verifyMessage(message, signature);
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return res.status(401).json({ error: "Invalid signature" });
  }
  
  req.wallet = address.toLowerCase();
  next();
}
```

**Client side — hydration-safe wallet context:**

```typescript
// client/components/WalletConnect.tsx — SSR-safe wallet hook
// CRITICAL: Never access window.ethereum in useEffect([], [])
useEffect(() => {
  setHydrated(true); // NO wallet calls — just mark hydration done
}, []);

// Wallet only opens on explicit user click
const connect = async () => {
  const ethereum = (window as any).ethereum;
  const provider = new ethers.BrowserProvider(ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  // ... set state
};

// Generate auth headers for API calls
const getAuth = async () => {
  const timestamp = Date.now().toString();
  const message = `SkillForge:${timestamp}`;
  const signature = await signer.signMessage(message);
  return { address, signature, timestamp };
};
```

---

### 2. Content Hashing & Verification (keccak256)

Every SKILL.md file is hashed at publish time. Agents can download a skill and verify its authenticity by recomputing the hash.

```typescript
// server/lib/openwork.ts — Content integrity
export function hashContent(content: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(content));
}

// Used in the publish route:
const contentHash = hashContent(content); // "0xdd063fec3a..."
// Stored alongside the skill in MongoDB
// Agents verify: keccak256(downloaded_skill) === stored_contentHash
```

**Verification flow:**
```
Publisher → uploads SKILL.md → server computes keccak256 → stores hash
Agent → downloads SKILL.md → computes keccak256 locally → compares
Match ✅ → skill is authentic | Mismatch ❌ → skill was tampered
```

---

### 3. $OPENWORK Balance Gating

Publishers must hold ≥100,000 $OPENWORK to publish — this prevents spam while keeping the barrier low (~$1 USD).

```typescript
// server/lib/openwork.ts — On-chain balance check via Base RPC
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export async function getBalance(address: string): Promise<string> {
  const contract = new ethers.Contract(OPENWORK_TOKEN, ERC20_ABI, provider);
  const balance = await Promise.race([
    contract.balanceOf(address),
    new Promise((_, reject) => setTimeout(() => reject("timeout"), 8000)),
  ]);
  return ethers.formatEther(balance);
}

// In publish route — server/routes/skills.ts
const balance = await getBalance(req.wallet!);
if (parseFloat(balance) < 100000) {
  return res.status(403).json({
    error: "Insufficient $OPENWORK balance",
    hint: "Need ≥100,000 $OPENWORK to publish. Current: " + balance,
  });
}
```

---

### 4. On-Chain Payment Verification

For paid skills, the server verifies the actual $OPENWORK transfer on Base by parsing transaction receipt logs.

```typescript
// server/lib/openwork.ts — Verify $OPENWORK payment on Base
export async function verifyPayment(
  txHash: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: bigint
): Promise<boolean> {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) return false;

  // Parse Transfer events from the tx receipt
  const contract = getOpenworkContract();
  const transferEvents = receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog({ topics: [...log.topics], data: log.data });
      } catch { return null; }
    })
    .filter((e) => e?.name === "Transfer");

  // Verify: correct sender, recipient, and amount
  return transferEvents.some((event) => {
    if (!event) return false;
    return (
      event.args[0].toLowerCase() === expectedFrom.toLowerCase() &&
      event.args[1].toLowerCase() === expectedTo.toLowerCase() &&
      event.args[2] >= expectedAmount
    );
  });
}
```

**Install flow with payment:**
```typescript
// server/routes/skills.ts — Install with payment verification
if (skill.pricing.model !== "free" && skill.pricing.amount > 0) {
  const { txHash } = req.body;
  const valid = await verifyPayment(
    txHash,
    req.wallet!,                                       // buyer
    skill.author.address,                              // seller
    ethers.parseEther(skill.pricing.amount.toString()) // amount
  );
  if (!valid) return res.status(400).json({ error: "Payment verification failed" });
}

// Record install + update stats atomically
await Install.create({ skillId: skill._id, agentAddress: req.wallet, txHash });
await Skill.findByIdAndUpdate(skill._id, {
  $inc: { "stats.installs": 1, "stats.revenue": skill.pricing.amount },
});
```

---

### 5. Mint Club V2 Bonding Curve Token

Team token created on-chain with a 3-step bonding curve backed by $OPENWORK. Price increases as supply grows.

```typescript
// server/scripts/create-token.ts — Bonding curve token creation
const BOND_ADDRESS = "0xc5a076cad94176c2996B32d8466Be1cE757FAa27"; // Mint Club V2 on Base

// 3-step pricing: early buyers get cheaper tokens
const STEP_RANGES = [
  ethers.parseEther("100000"),  // first 100K tokens
  ethers.parseEther("500000"),  // next 400K tokens  
  ethers.parseEther("1000000"), // final 500K tokens
];
const STEP_PRICES = [
  ethers.parseEther("0.001"),   // 0.001 $OW each
  ethers.parseEther("0.005"),   // 0.005 $OW each
  ethers.parseEther("0.01"),    // 0.01 $OW each
];

// Create token on Mint Club V2
const tx = await bond.createToken(
  { name: "SkillForge Token", symbol: "SKLFRG" },
  {
    mintRoyalty: 100,        // 1% mint fee
    burnRoyalty: 100,        // 1% burn fee
    reserveToken: OPENWORK_TOKEN,
    maxSupply: ethers.parseEther("1000000"),
    stepRanges: STEP_RANGES,
    stepPrices: STEP_PRICES,
  },
  { value: creationFee }
);
// → Token live at: https://mint.club/token/base/SKLFRG
```

---

### 6. Skill Publishing (Full Pipeline)

The complete publish pipeline: auth → validate → balance check → hash → store → respond.

```typescript
// server/routes/skills.ts — POST /api/skills
router.post("/", authWallet, async (req: AuthRequest, res: Response) => {
  const { name, symbol, description, category, content, pricing, compatibility, tags } = req.body;

  // 1. Validate required fields
  if (!name || !symbol || !description || !category || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // 2. Check $OPENWORK balance on Base (spam prevention)
  const balance = await getBalance(req.wallet!);
  if (parseFloat(balance) < 100000) {
    return res.status(403).json({ error: "Insufficient $OPENWORK balance" });
  }

  // 3. Hash SKILL.md content for verification
  const contentHash = hashContent(content); // keccak256

  // 4. Store skill with author wallet, pricing, and hash
  const skill = await Skill.create({
    name, symbol: symbol.toUpperCase(), description, category,
    content, contentHash,
    author: { address: req.wallet, name: req.body.authorName },
    pricing: pricing || { model: "free", amount: 0 },
    compatibility: compatibility || [],
    tags: tags || [],
  });

  res.status(201).json({ skill, contentHash });
});
```

---

## 📂 Project Structure

```
skillforge/                         33 files
├── client/                         Next.js 14 Frontend
│   ├── app/
│   │   ├── page.tsx                Homepage — browse, search, featured skills
│   │   ├── layout.tsx              Root layout + OG meta + WalletProvider
│   │   ├── globals.css             Custom dark theme + animations
│   │   ├── dashboard/page.tsx      Publisher dashboard — stats, skills list
│   │   └── skills/[id]/page.tsx    Skill detail — install, rate, SKILL.md viewer
│   ├── components/
│   │   ├── WalletConnect.tsx       Hydration-safe wallet context (React Context)
│   │   ├── Navbar.tsx              Navigation + wallet connect button
│   │   ├── PublishModal.tsx        2-step publish wizard (metadata → content)
│   │   ├── SkillCard.tsx           Skill preview card with stats
│   │   └── Footer.tsx              Site footer with links
│   └── lib/utils.ts                API helpers, formatters, constants
│
├── server/                         Express.js Backend
│   ├── index.ts                    Server setup, CORS, MongoDB connect
│   ├── routes/skills.ts            Full REST API — browse, publish, install, rate
│   ├── models/
│   │   ├── Skill.ts                Skill schema with text search indexes
│   │   └── Install.ts             Install records with ratings
│   ├── middleware/auth.ts          EIP-191 wallet signature verification
│   ├── lib/openwork.ts            $OPENWORK balance, payment verify, hashing
│   └── scripts/create-token.ts    Mint Club V2 bonding curve creator
│
├── .gitignore
├── README.md
└── DEPLOYMENT.md                   Full deployment + submission guide
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or [Atlas](https://cloud.mongodb.com))
- MetaMask or compatible wallet on Base
- $OPENWORK tokens (≥100K to publish, ~$1 USD)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/skillforge.git
cd skillforge
```

### 2. Start the Backend

```bash
cd server
npm install
cp .env.example .env    # Edit with your MongoDB URI
npm run dev              # → http://localhost:4000
```

### 3. Start the Frontend

```bash
cd client
npm install
npm run dev              # → http://localhost:3000
```

### 4. Open in Browser

Visit `http://localhost:3000`, connect your wallet, and start publishing!

---

## ⚙️ Environment Variables

### Server (`server/.env`)
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/skillforge
OPENWORK_RPC=https://mainnet.base.org
OPENWORK_TOKEN=0x299c30DD5974BF4D5bFE42C340CA40462816AB07
BOND_CONTRACT=0xc5a076cad94176c2996B32d8466Be1cE757FAa27
PRIVATE_KEY=your_wallet_private_key_here
```

### Client (`client/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_OPENWORK_TOKEN=0x299c30DD5974BF4D5bFE42C340CA40462816AB07
```

---

## 🔌 API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/skills` | Browse skills (`q`, `category`, `sort`, `page`) |
| `GET` | `/api/skills/featured` | Featured, trending, newest |
| `GET` | `/api/skills/categories` | Category stats |
| `GET` | `/api/skills/:id` | Skill detail (content gated for paid) |
| `GET` | `/api/skills/:id/reviews` | Reviews for a skill |

### Authenticated Endpoints (wallet signature required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/skills` | Publish a new skill |
| `PUT` | `/api/skills/:id` | Update your skill |
| `POST` | `/api/skills/:id/install` | Install (+ payment verify for paid) |
| `POST` | `/api/skills/:id/rate` | Rate installed skill (1-5 stars) |
| `GET` | `/api/skills/dashboard/stats` | Publisher dashboard |

### Auth Headers
```
x-wallet-address: 0xYourAddress
x-signature: <signed "SkillForge:<timestamp>">
x-timestamp: <unix ms>
```

---

## 🪙 Token Integration

### $OPENWORK
- **Contract:** `0x299c30DD5974BF4D5bFE42C340CA40462816AB07`
- **Chain:** Base Mainnet (8453)
- **DEX:** [View on DexScreener](https://dexscreener.com/base/0x2174bd22600ba56234e283c5bd0da2824cc84c15c437e5909c2c38c5701841ea)
- **Dashboard:** [Sentinel Dashboard](https://team-sentinel.vercel.app/)

### Create Team Token
```bash
cd server
PRIVATE_KEY=0xYourKey npx ts-node scripts/create-token.ts
# → Token created at: https://mint.club/token/base/SKLFRG
```

---

## 🛣️ Roadmap

- [x] Core marketplace (browse, search, filter)
- [x] Skill publishing with SKILL.md
- [x] Wallet authentication (Base network)
- [x] $OPENWORK payments + balance gating
- [x] Content hashing (keccak256)
- [x] Publisher dashboard with stats
- [x] Rating & review system
- [x] Mint Club V2 bonding curve token
- [ ] Agent-to-agent skill discovery API
- [ ] Automated skill testing/validation
- [ ] On-chain skill registry (full decentralization)
- [ ] Multi-chain support (Arbitrum, Optimism)
- [ ] Skill composability (dependency chains)

---

## 🏆 Clawathon Submission

**Hackathon:** [Clawathon](https://openwork.bot/hackathon) — First AI Agent Hackathon by OpenWork

| Criteria | Weight | How We Address It |
|----------|--------|------------------|
| **Completeness** | 24% | Full-stack marketplace — browse, publish, install, rate, dashboard |
| **Code Quality** | 19% | TypeScript, clean architecture, documented API, 33 files |
| **Design & UX** | 19% | Custom dark theme, animations, responsive, noise texture |
| **Token Integration** | 19% | $OPENWORK payments, balance gating, Mint Club bonding curve |
| **Team Coordination** | 14% | PRs, issues, commit history, structured codebase |
| **Pilot Oversight** | 5% | Human-guided development with active oversight |

---

## 👥 Team

Built by **SPARSH** and **AAVESH** — Full-stack developer, Web3 + AI.

- 🏆 1st Place — Ninja Break Content Festival (HackQuest × Injective)
- 💼 Software Engineer Intern @ QuantMaster AI
- 🏗️ Stack: React, Next.js, Node.js, Solidity, ethers.js

---

## 📜 License

MIT

---
