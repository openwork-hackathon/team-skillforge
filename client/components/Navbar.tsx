"use client";

import Link from "next/link";
import { useWallet } from "@/components/WalletConnect";
import { shortenAddress, formatOPENWORK } from "@/lib/utils";

export default function Navbar() {
  const { address, balance, isConnecting, isConnected, hydrated, connect } = useWallet();

  return (
    <nav className="sticky top-0 z-50 border-b border-dark-600 bg-dark-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">🦞</span>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-forge-500">Skill</span>
            <span className="text-claw-400">Forge</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Browse</Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">Dashboard</Link>
          <a href="https://openwork.bot/hackathon" target="_blank" rel="noopener" className="text-sm text-gray-400 hover:text-white transition-colors">Clawathon ↗</a>
        </div>

        {/* Only render wallet UI after hydration */}
        {hydrated && (
          <>
            {isConnected && address ? (
              <div className="flex items-center gap-3">
                {balance && (
                  <span className="hidden lg:inline text-xs text-forge-400 bg-forge-500/10 px-2.5 py-1 rounded-lg border border-forge-500/20">
                    {formatOPENWORK(parseFloat(balance))}
                  </span>
                )}
                <span className="hidden sm:inline text-xs font-mono text-gray-500 bg-dark-700 px-3 py-1.5 rounded-lg border border-dark-600">
                  {shortenAddress(address)}
                </span>
                <div className="h-3 w-3 rounded-full bg-claw-500 animate-pulse" title="Connected to Base" />
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="rounded-lg bg-forge-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-forge-500 hover:shadow-lg hover:shadow-forge-500/25 disabled:opacity-50"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </>
        )}
      </div>
    </nav>
  );
}