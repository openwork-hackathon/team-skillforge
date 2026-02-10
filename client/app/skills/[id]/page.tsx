"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletConnect";
import { fetchAPI, fetchAuthAPI, shortenAddress, formatOPENWORK, CATEGORIES } from "@/lib/utils";

export default function SkillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const wallet = useWallet();

  const [skill, setSkill] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRate, setShowRate] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [mounted, setMounted] = useState(false);

  // Load skill data (public, no wallet needed)
  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      loadSkill();
    }, 50);
    return () => clearTimeout(timer);
  }, [params.id]);

  async function loadSkill() {
    try {
      const [s, r] = await Promise.all([
        fetchAPI(`/skills/${params.id}`),
        fetchAPI(`/skills/${params.id}/reviews`),
      ]);
      setSkill(s);
      setReviews(r);
    } catch (err: any) {
      console.error("Load skill error:", err);
    }
    setLoading(false);
  }

  async function handleInstall() {
    if (!wallet.isConnected) {
      await wallet.connect();
      return;
    }
    setInstalling(true);
    try {
      const auth = await wallet.getAuth();
      const result = await fetchAuthAPI(`/skills/${params.id}/install`, auth, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setSkill((prev: any) => ({
        ...prev, installed: true, content: result.content,
        stats: { ...prev.stats, installs: prev.stats.installs + 1 },
      }));
    } catch (err: any) {
      alert("Install failed: " + err.message);
    }
    setInstalling(false);
  }

  async function handleRate() {
    if (!wallet.isConnected) {
      await wallet.connect();
      return;
    }
    try {
      const auth = await wallet.getAuth();
      await fetchAuthAPI(`/skills/${params.id}/rate`, auth, {
        method: "POST",
        body: JSON.stringify({ rating, review: reviewText }),
      });
      setShowRate(false);
      loadSkill();
    } catch (err: any) {
      alert("Rating failed: " + err.message);
    }
  }

  function copyContent() {
    navigator.clipboard.writeText(skill.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || !mounted) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 animate-pulse space-y-6">
        <div className="h-10 bg-dark-700 rounded w-1/2" />
        <div className="h-6 bg-dark-700 rounded w-3/4" />
        <div className="h-64 bg-dark-700 rounded" />
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="text-4xl mb-4">😿</div>
        <h2 className="text-xl font-bold text-white mb-2">Skill not found</h2>
        <button type="button" onClick={() => router.push("/")} className="text-forge-400 text-sm">← Back</button>
      </div>
    );
  }

  const cat = CATEGORIES.find((c) => c.id === skill.category);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <button type="button" onClick={() => router.push("/")} className="text-sm text-gray-500 hover:text-white mb-6 transition-colors">
        ← Back to skills
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{cat?.emoji || "📦"}</span>
            <div>
              <h1 className="text-3xl font-bold text-white">{skill.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-mono text-gray-500">{skill.symbol}</span>
                <span className="text-gray-700">•</span>
                <span className="text-sm text-gray-500">v{skill.version}</span>
                {skill.verified && (
                  <span className="text-xs bg-claw-500/20 text-claw-400 px-2 py-0.5 rounded-full">✓ Verified</span>
                )}
              </div>
            </div>
          </div>
          <p className="text-gray-400 leading-relaxed mb-4">{skill.description}</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>by</span>
            <span className="text-white font-medium">{skill.author.name}</span>
            <span className="font-mono text-xs text-gray-600">({shortenAddress(skill.author.address)})</span>
          </div>
        </div>

        {/* Action panel */}
        <div className="w-full md:w-72 rounded-xl border border-dark-600 bg-dark-800 p-5 shrink-0">
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-white mb-1">{formatOPENWORK(skill.pricing.amount)}</div>
            <div className="text-xs text-gray-500">{skill.pricing.model} license</div>
          </div>

          {skill.installed ? (
            <div className="space-y-3">
              <div className="bg-claw-500/15 text-claw-400 text-center py-2.5 rounded-lg text-sm font-medium border border-claw-500/30">✓ Installed</div>
              <button type="button" onClick={() => setShowRate(true)} className="w-full rounded-lg border border-dark-600 py-2.5 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors cursor-pointer">
                ★ Rate this skill
              </button>
            </div>
          ) : (
            <button type="button" onClick={handleInstall} disabled={installing} className="w-full rounded-lg bg-forge-600 py-3 text-sm font-semibold text-white hover:bg-forge-500 transition-all disabled:opacity-50 cursor-pointer">
              {installing ? "Installing..." : wallet.isConnected ? "↓ Install Skill" : "Connect & Install"}
            </button>
          )}

          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-dark-600">
            {[
              { val: skill.stats.installs.toLocaleString(), label: "Installs" },
              { val: skill.stats.ratingCount > 0 ? `★${skill.stats.rating}` : "—", label: "Rating" },
              { val: cat?.label || "—", label: "Category" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-lg font-bold text-white">{s.val}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-8">
        {skill.compatibility?.map((c: string) => (
          <span key={c} className="text-xs font-mono px-3 py-1 rounded-lg bg-dark-700 text-gray-400 border border-dark-600">{c}</span>
        ))}
        {skill.tags?.map((t: string) => (
          <span key={t} className="text-xs px-3 py-1 rounded-lg bg-forge-500/10 text-forge-400 border border-forge-500/20">#{t}</span>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 overflow-hidden mb-8">
        <div className="flex items-center justify-between px-5 py-3 border-b border-dark-600 bg-dark-900/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-400">SKILL.md</span>
            {skill.contentHash && <span className="text-xs text-gray-600 font-mono">{skill.contentHash.slice(0, 12)}...</span>}
          </div>
          <button type="button" onClick={copyContent} className="text-xs text-gray-500 hover:text-white px-3 py-1 rounded border border-dark-600 hover:border-gray-500 transition-colors cursor-pointer">
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
        </div>
        <pre className="p-5 text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {skill.content}
        </pre>
      </div>

      {/* Install command */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-5 mb-8">
        <h3 className="text-sm font-semibold text-white mb-3">Quick Install</h3>
        <div className="bg-dark-900 rounded-lg p-4 font-mono text-sm text-claw-400 overflow-x-auto">
          mkdir -p ~/.openwork/skills/{skill.symbol?.toLowerCase()} && curl -s YOUR_API/skills/{skill._id}/content &gt; ~/.openwork/skills/{skill.symbol?.toLowerCase()}/SKILL.md
        </div>
      </div>

      {/* Reviews */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Reviews {reviews.length > 0 && <span className="text-gray-500 font-normal">({reviews.length})</span>}</h3>
        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((r, i) => (
              <div key={i} className="rounded-lg border border-dark-600 bg-dark-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    <span className="text-xs font-mono text-gray-500">{shortenAddress(r.agentAddress)}</span>
                  </div>
                  <span className="text-xs text-gray-600">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.review && <p className="text-sm text-gray-400">{r.review}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No reviews yet.</p>
        )}
      </div>

      {/* Rating modal */}
      {showRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-dark-600 bg-dark-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Rate {skill.name}</h3>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl cursor-pointer ${n <= rating ? "text-yellow-400" : "text-gray-600"}`}>★</button>
              ))}
            </div>
            <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Optional review..." rows={3} className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-white placeholder-gray-600 focus:border-forge-500 focus:outline-none resize-none mb-4" />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowRate(false)} className="text-sm text-gray-400 px-4 py-2 cursor-pointer">Cancel</button>
              <button type="button" onClick={handleRate} className="rounded-lg bg-forge-600 px-5 py-2 text-sm font-semibold text-white hover:bg-forge-500 cursor-pointer">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}