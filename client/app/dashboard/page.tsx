"use client";

import { useState } from "react";
import PublishModal from "@/components/PublishModal";
import { formatOPENWORK, shortenAddress, fetchAuthAPI } from "@/lib/utils";
import { useWallet } from "@/components/WalletConnect";
import Link from "next/link";

export default function DashboardPage() {
  const wallet = useWallet();
  const [showPublish, setShowPublish] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function handleConnect() {
    console.log("[Dashboard] Connect clicked");
    await wallet.connect();
    console.log("[Dashboard] Connect done, address:", wallet.address);
  }

  async function handleLoadData() {
    if (!wallet.isConnected) return;
    console.log("[Dashboard] Loading data...");
    setLoading(true);
    setError("");
    try {
      const auth = await wallet.getAuth();
      const result = await fetchAuthAPI("/skills/dashboard/stats", auth);
      setData(result);
      setLoaded(true);
      console.log("[Dashboard] Data loaded:", result);
    } catch (err: any) {
      console.error("[Dashboard] Load error:", err);
      setError(err.message);
    }
    setLoading(false);
  }

  function handleOpenPublish() {
    console.log("[Dashboard] Opening publish modal");
    setShowPublish(true);
  }

  function handleClosePublish() {
    console.log("[Dashboard] Closing publish modal");
    setShowPublish(false);
  }

  function handlePublished() {
    console.log("[Dashboard] Skill published!");
    setShowPublish(false);
    if (wallet.isConnected) handleLoadData();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">

      {/* ── Header (always visible) ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Publisher Dashboard</h1>
          {wallet.address && (
            <p className="text-sm text-gray-500 font-mono mt-1">{shortenAddress(wallet.address)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleOpenPublish}
          className="rounded-lg bg-forge-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forge-500 transition-colors cursor-pointer"
        >
          + Publish New Skill
        </button>
      </div>

      {/* ── Not connected ── */}
      {!wallet.isConnected && (
        <div className="text-center py-16 rounded-xl border border-dark-600 bg-dark-800 mb-8">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-500 mb-6">Connect on Base to view your stats and published skills.</p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={wallet.isConnecting}
            className="rounded-xl bg-forge-600 px-8 py-3 text-sm font-semibold text-white hover:bg-forge-500 transition-all disabled:opacity-50 cursor-pointer"
          >
            {wallet.isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      )}

      {/* ── Connected but not loaded ── */}
      {wallet.isConnected && !loaded && !loading && (
        <div className="text-center py-16 rounded-xl border border-dark-600 bg-dark-800 mb-8">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">Load Your Dashboard</h2>
          <p className="text-gray-500 mb-6">Click below to fetch your published skills and stats.</p>
          <button
            type="button"
            onClick={handleLoadData}
            className="rounded-xl bg-claw-600 px-8 py-3 text-sm font-semibold text-white hover:bg-claw-500 transition-all cursor-pointer"
          >
            Load Dashboard
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="animate-pulse space-y-4 mb-8">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-dark-700 rounded-xl" />)}
          </div>
          <div className="h-64 bg-dark-700 rounded-xl" />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
          ⚠️ {error}
          <button type="button" onClick={handleLoadData} className="ml-4 underline text-xs">Retry</button>
        </div>
      )}

      {/* ── Stats ── */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Skills Published", value: data.stats.totalSkills, emoji: "📦" },
            { label: "Total Installs", value: data.stats.totalInstalls.toLocaleString(), emoji: "↓" },
            { label: "Revenue ($OW)", value: formatOPENWORK(data.stats.totalRevenue), emoji: "💰" },
            { label: "Avg Rating", value: data.stats.avgRating > 0 ? `★ ${data.stats.avgRating}` : "—", emoji: "⭐" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-dark-600 bg-dark-800 p-5">
              <div className="text-sm text-gray-500 mb-2">{stat.label}</div>
              <div className="text-2xl font-bold text-white">{stat.emoji} {stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Skills list ── */}
      {loaded && (
        <div className="rounded-xl border border-dark-600 bg-dark-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-600">
            <h2 className="text-lg font-semibold text-white">Your Skills</h2>
          </div>

          {data?.skills?.length > 0 ? (
            <div className="divide-y divide-dark-600">
              {data.skills.map((skill: any) => (
                <Link key={skill._id} href={`/skills/${skill._id}`}>
                  <div className="flex items-center justify-between px-5 py-4 hover:bg-dark-700 transition-colors cursor-pointer">
                    <div>
                      <div className="font-medium text-white">{skill.name}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono text-gray-500">{skill.symbol}</span>
                        <span className="text-xs text-gray-600">v{skill.version}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-white">{skill.stats.installs}</div>
                        <div className="text-xs text-gray-500">installs</div>
                      </div>
                      <span className="text-gray-600">→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">🦞</div>
              <h3 className="text-lg font-bold text-white mb-2">No skills published yet</h3>
              <p className="text-sm text-gray-500 mb-5">Publish your first skill!</p>
              <button
                type="button"
                onClick={handleOpenPublish}
                className="rounded-lg bg-forge-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forge-500 transition-colors cursor-pointer"
              >
                Publish Your First Skill
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── On-chain info ── */}
      <div className="mt-8 rounded-xl border border-dark-600 bg-dark-800 p-5">
        <h3 className="text-sm font-semibold text-white mb-2">🔗 On-Chain Verification</h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          Every skill content is hashed (keccak256) and stored alongside the record for verification.
        </p>
      </div>

      {/* ── Modal ── */}
      <PublishModal
        isOpen={showPublish}
        onClose={handleClosePublish}
        onPublished={handlePublished}
      />
    </div>
  );
}