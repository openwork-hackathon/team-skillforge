import { ethers } from "ethers";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const OPENWORK_TOKEN = process.env.NEXT_PUBLIC_OPENWORK_TOKEN || "0x299c30DD5974BF4D5bFE42C340CA40462816AB07";

// ─── Wallet helpers ───
export async function connectWallet() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No wallet found. Install MetaMask or similar.");
  }
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // Ensure Base network (chainId 8453)
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(8453)) {
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x2105",
              chainName: "Base",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://mainnet.base.org"],
              blockExplorerUrls: ["https://basescan.org"],
            },
          ],
        });
      }
    }
  }

  return { provider, signer, address };
}

export async function signAuth(signer: ethers.Signer) {
  const timestamp = Date.now().toString();
  const message = `SkillForge:${timestamp}`;
  const signature = await signer.signMessage(message);
  const address = await signer.getAddress();
  return { address, signature, timestamp };
}

// ─── API helpers ───
export async function fetchAPI(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || err.message || "Request failed");
  }
  return res.json();
}

export async function fetchAuthAPI(
  path: string,
  auth: { address: string; signature: string; timestamp: string },
  options: RequestInit = {}
) {
  return fetchAPI(path, {
    ...options,
    headers: {
      "x-wallet-address": auth.address,
      "x-signature": auth.signature,
      "x-timestamp": auth.timestamp,
      ...options.headers,
    },
  });
}

// ─── Format helpers ───
export function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatOPENWORK(amount: number) {
  if (amount === 0) return "Free";
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M $OW`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K $OW`;
  return `${amount} $OW`;
}

export const CATEGORIES = [
  { id: "all", label: "All", emoji: "🌐" },
  { id: "defi", label: "DeFi", emoji: "💰" },
  { id: "coding", label: "Coding", emoji: "💻" },
  { id: "analytics", label: "Analytics", emoji: "📊" },
  { id: "social", label: "Social", emoji: "💬" },
  { id: "trading", label: "Trading", emoji: "📈" },
  { id: "security", label: "Security", emoji: "🔒" },
  { id: "infrastructure", label: "Infra", emoji: "🏗️" },
  { id: "content", label: "Content", emoji: "✍️" },
  { id: "data", label: "Data", emoji: "🗄️" },
  { id: "other", label: "Other", emoji: "🔮" },
] as const;

export const COMPATIBILITY_OPTIONS = [
  "claude-code",
  "cursor",
  "devin",
  "openwork-claw",
  "github-copilot",
  "custom",
];