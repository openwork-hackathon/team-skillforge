"use client";

import { useState } from "react";
import { useWallet } from "@/components/WalletConnect";
import { fetchAuthAPI, CATEGORIES, COMPATIBILITY_OPTIONS, shortenAddress } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPublished: () => void;
}

export default function PublishModal({ isOpen, onClose, onPublished }: Props) {
  const { address, isConnected, isConnecting, connect, getAuth, balance } = useWallet();

  const [step, setStep] = useState(1); // 1=metadata, 2=content, 3=success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);

  const [form, setForm] = useState({
    name: "", symbol: "", description: "", category: "coding",
    content: "", authorName: "",
    pricingModel: "free" as "free" | "one-time" | "subscription",
    pricingAmount: 0, compatibility: [] as string[],
    tags: "", version: "1.0.0",
  });

  function updateForm(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function toggleCompat(item: string) {
    setForm((prev) => ({
      ...prev,
      compatibility: prev.compatibility.includes(item)
        ? prev.compatibility.filter((c) => c !== item)
        : [...prev.compatibility, item],
    }));
  }

  function goToStep2() {
    if (!form.name.trim()) { setError("Skill name is required"); return; }
    if (!form.symbol.trim() || form.symbol.length < 2) { setError("Symbol required (2-10 chars)"); return; }
    if (!form.description.trim() || form.description.length < 20) { setError("Description min 20 chars"); return; }
    setError("");
    setStep(2);
  }

  async function handlePublish() {
    if (!form.content.trim() || form.content.length < 50) { setError("SKILL.md content too short (min 50 chars)"); return; }
    if (form.pricingModel !== "free" && form.pricingAmount <= 0) { setError("Set a price for paid skills"); return; }
    if (!isConnected) { setError("Connect wallet first"); return; }

    setLoading(true);
    setError("");

    try {
      const auth = await getAuth();
      const result = await fetchAuthAPI("/skills", auth, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          symbol: form.symbol.trim().toUpperCase(),
          description: form.description.trim(),
          category: form.category,
          content: form.content,
          authorName: form.authorName.trim() || `Agent-${address!.slice(0, 8)}`,
          pricing: { model: form.pricingModel, amount: form.pricingModel === "free" ? 0 : form.pricingAmount },
          compatibility: form.compatibility,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          version: form.version || "1.0.0",
        }),
      });
      setSuccess(result);
      setStep(3);
      onPublished();
    } catch (err: any) {
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        setError("Server unreachable. Run: cd server && npm run dev");
      } else {
        setError(err.message || "Publishing failed");
      }
    }
    setLoading(false);
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      if (success) {
        setStep(1);
        setSuccess(null);
        setForm({ name: "", symbol: "", description: "", category: "coding", content: "", authorName: "", pricingModel: "free", pricingAmount: 0, compatibility: [], tags: "", version: "1.0.0" });
      }
      setError("");
    }, 200);
  }

  if (!isOpen) return null;

  // ── Not connected: show connect prompt ──
  if (!isConnected) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 shadow-2xl animate-slide-up p-8 text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-gray-400 mb-6">Connect on Base network to publish skills. Need ≥100K $OPENWORK.</p>
          <button onClick={connect} disabled={isConnecting} className="rounded-xl bg-forge-600 px-8 py-3 text-sm font-semibold text-white hover:bg-forge-500 transition-all disabled:opacity-50">
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
          <p className="text-xs text-gray-600 mt-4">MetaMask, Coinbase Wallet, or injected wallets</p>
          <button onClick={handleClose} className="mt-4 text-xs text-gray-500 hover:text-white">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl border border-dark-600 bg-dark-800 shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-600 p-6">
          <div>
            <h2 className="text-xl font-bold text-white">{step === 3 ? "🎉 Published!" : "Publish a Skill"}</h2>
            {step < 3 && <p className="text-sm text-gray-500 mt-1">Step {step} of 2</p>}
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Wallet indicator */}
          {step < 3 && address && (
            <div className="flex items-center justify-between bg-claw-500/10 border border-claw-500/30 rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-claw-500 animate-pulse" />
                <span className="text-xs text-claw-400">Connected:</span>
                <span className="text-xs font-mono text-claw-300">{shortenAddress(address)}</span>
              </div>
              {balance && <span className="text-xs text-gray-500">{parseFloat(balance).toLocaleString()} $OW</span>}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
              <span className="shrink-0">⚠️</span><span>{error}</span>
            </div>
          )}

          {/* ── Step 1: Metadata ── */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Skill Name <span className="text-forge-500">*</span></label>
                  <input type="text" value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="e.g. DeFi Yield Analyzer" className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-white placeholder-gray-600 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Symbol <span className="text-forge-500">*</span></label>
                  <input type="text" value={form.symbol} onChange={(e) => updateForm("symbol", e.target.value.toUpperCase())} placeholder="DEFIYLD" maxLength={10} className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-white placeholder-gray-600 focus:border-forge-500 focus:outline-none font-mono uppercase" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description <span className="text-forge-500">*</span></label>
                <textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="What does this skill do? Be specific." rows={3} className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-white placeholder-gray-600 focus:border-forge-500 focus:outline-none resize-none" />
                <p className="text-xs text-gray-600 mt-1">{form.description.length} chars (min 20)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Category <span className="text-forge-500">*</span></label>
                  <select value={form.category} onChange={(e) => updateForm("category", e.target.value)} className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-white focus:border-forge-500 focus:outline-none">
                    {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Version</label>
                  <input type="text" value={form.version} onChange={(e) => updateForm("version", e.target.value)} className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-white font-mono focus:border-forge-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Author / Agent Name</label>
                <input type="text" value={form.authorName} onChange={(e) => updateForm("authorName", e.target.value)} placeholder="Your agent or team name" className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-white placeholder-gray-600 focus:border-forge-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Compatible With</label>
                <div className="flex flex-wrap gap-2">
                  {COMPATIBILITY_OPTIONS.map((opt) => (
                    <button key={opt} type="button" onClick={() => toggleCompat(opt)} className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${form.compatibility.includes(opt) ? "bg-forge-500/20 border-forge-500/50 text-forge-400" : "bg-dark-700 border-dark-600 text-gray-500 hover:border-gray-500"}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Tags (comma-separated)</label>
                <input type="text" value={form.tags} onChange={(e) => updateForm("tags", e.target.value)} placeholder="yield, farming, defi" className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-white placeholder-gray-600 focus:border-forge-500 focus:outline-none" />
              </div>
            </>
          )}

          {/* ── Step 2: Content & Pricing ── */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Pricing Model</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "free", label: "Free", desc: "Open access", emoji: "🆓" },
                    { id: "one-time", label: "One-time", desc: "Pay once", emoji: "💰" },
                    { id: "subscription", label: "Subscription", desc: "Recurring", emoji: "🔄" },
                  ].map((p) => (
                    <button key={p.id} type="button" onClick={() => updateForm("pricingModel", p.id)} className={`rounded-lg border p-3 text-left transition-all ${form.pricingModel === p.id ? "bg-forge-500/15 border-forge-500/50" : "bg-dark-700 border-dark-600 hover:border-gray-500"}`}>
                      <div className="text-lg mb-1">{p.emoji}</div>
                      <div className="text-sm font-medium text-white">{p.label}</div>
                      <div className="text-xs text-gray-500">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {form.pricingModel !== "free" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Price ($OPENWORK)</label>
                  <input type="number" value={form.pricingAmount} onChange={(e) => updateForm("pricingAmount", parseFloat(e.target.value) || 0)} placeholder="100000" min={0} className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-white font-mono focus:border-forge-500 focus:outline-none" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">SKILL.md Content <span className="text-forge-500">*</span></label>
                <p className="text-xs text-gray-500 mb-2">Paste your full SKILL.md. This is what agents download.</p>
                <textarea value={form.content} onChange={(e) => updateForm("content", e.target.value)} placeholder={`---\nname: my-skill\nversion: 1.0.0\n---\n\n# My Skill\n\nInstructions...`} rows={14} className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-white placeholder-gray-600 focus:border-forge-500 focus:outline-none resize-none font-mono text-sm leading-relaxed" />
                <p className="text-xs text-gray-600 mt-1">{form.content.length} chars (min 50)</p>
              </div>
            </>
          )}

          {/* ── Step 3: Success ── */}
          {step === 3 && success && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-white mb-2">Skill Published!</h3>
              <p className="text-sm text-gray-400 mb-6">
                <span className="text-claw-400 font-semibold">{form.name}</span> ({form.symbol}) is live.
              </p>
              {success.contentHash && (
                <div className="bg-dark-900 rounded-lg p-4 mb-6 text-left">
                  <p className="text-xs text-gray-500 mb-1">Content Hash (store on-chain):</p>
                  <p className="text-xs font-mono text-claw-400 break-all">{success.contentHash}</p>
                </div>
              )}
              {success.next_steps && (
                <div className="text-left bg-dark-700 rounded-lg p-4 mb-6">
                  <p className="text-xs font-medium text-gray-300 mb-2">Next steps:</p>
                  <ul className="space-y-1">
                    {success.next_steps.map((s: string, i: number) => (
                      <li key={i} className="text-xs text-gray-400 flex gap-2"><span className="text-forge-400">→</span>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={handleClose} className="rounded-lg bg-forge-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-forge-500">Done</button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 3 && (
          <div className="flex items-center justify-between border-t border-dark-600 p-6">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="text-sm text-gray-400 hover:text-white">← Back</button>
            ) : <div />}
            {step === 1 ? (
              <button onClick={goToStep2} className="rounded-lg bg-forge-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forge-500">
                Next: Content & Pricing →
              </button>
            ) : (
              <button onClick={handlePublish} disabled={loading} className="rounded-lg bg-claw-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-claw-500 disabled:opacity-50 flex items-center gap-2">
                {loading ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Publishing...</>
                ) : "🦞 Publish Skill"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}