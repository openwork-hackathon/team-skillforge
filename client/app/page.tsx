"use client";

import { useState, useEffect, useCallback } from "react";
import { connectWallet, signAuth, fetchAuthAPI, formatOPENWORK, shortenAddress } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { signer, address: addr } = await connectWallet();
      setAddress(addr);
      const auth = await signAuth(signer);
      const result = await fetchAuthAPI("/skills/dashboard/stats", auth);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (error && !data) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-500 mb-6">Connect your wallet to view your publisher dashboard.</p>
        <button
          onClick={loadDashboard}
          className="rounded-xl bg-forge-600 px-8 py-3 text-sm font-semibold text-white hover:bg-forge-500 transition-all"
        >
          Connect & Load Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 animate-pulse space-y-6">
        <div className="h-10 bg-dark-700 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-dark-700 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-dark-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Publisher Dashboard</h1>
          {address && (
            <p className="text-sm text-gray-500 font-mono mt-1">{shortenAddress(address)}</p>
          )}
        </div>
        <Link
          href="/"
          className="rounded-lg bg-forge-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forge-500 transition-colors"
        >
          + Publish New Skill
        </Link>
      </div>

      {/* Stats cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Skills Published", value: data.stats.totalSkills, emoji: "📦", color: "forge" },
            { label: "Total Installs", value: data.stats.totalInstalls.toLocaleString(), emoji: "↓", color: "claw" },
            { label: "Revenue ($OW)", value: formatOPENWORK(data.stats.totalRevenue), emoji: "💰", color: "forge" },
            { label: "Avg Rating", value: data.stats.avgRating > 0 ? `★ ${data.stats.avgRating}` : "—", emoji: "⭐", color: "claw" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-dark-600 bg-dark-800 p-5"
            >
              <div className="text-sm text-gray-500 mb-2">{stat.label}</div>
              <div className="text-2xl font-bold text-white">
                {stat.emoji} {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skills table */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-600">
          <h2 className="text-lg font-semibold text-white">Your Skills</h2>
        </div>

        {data?.skills?.length > 0 ? (
          <div className="divide-y divide-dark-600">
            {data.skills.map((skill: any) => (
              <Link key={skill._id} href={`/skills/${skill._id}`}>
                <div className="flex items-center justify-between px-5 py-4 hover:bg-dark-700 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium text-white">{skill.name}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono text-gray-500">{skill.symbol}</span>
                        <span className="text-xs text-gray-600">v{skill.version}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          skill.pricing.model === "free"
                            ? "bg-claw-500/15 text-claw-400"
                            : "bg-forge-500/15 text-forge-400"
                        }`}>
                          {formatOPENWORK(skill.pricing.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-white">{skill.stats.installs}</div>
                      <div className="text-xs text-gray-500">installs</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-white">
                        {skill.stats.ratingCount > 0 ? `★${skill.stats.rating}` : "—"}
                      </div>
                      <div className="text-xs text-gray-500">rating</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-white">{formatOPENWORK(skill.stats.revenue)}</div>
                      <div className="text-xs text-gray-500">earned</div>
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
            <p className="text-sm text-gray-500 mb-5">Publish your first skill and start earning $OPENWORK!</p>
            <Link
              href="/"
              className="inline-block rounded-lg bg-forge-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forge-500 transition-colors"
            >
              Browse & Publish
            </Link>
          </div>
        )}
      </div>

      {/* Content hash info */}
      <div className="mt-8 rounded-xl border border-dark-600 bg-dark-800 p-5">
        <h3 className="text-sm font-semibold text-white mb-2">🔗 On-Chain Verification</h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          Every skill&apos;s content is hashed (keccak256) and the hash is stored alongside the record.
          Agents can verify skill authenticity by comparing the hash of the downloaded SKILL.md with the
          stored contentHash. For full on-chain verification, store the hash in your team&apos;s Mint Club token metadata.
        </p>
      </div>
    </div>
  );
}