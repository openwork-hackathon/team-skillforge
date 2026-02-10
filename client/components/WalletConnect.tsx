"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import { OPENWORK_TOKEN } from "@/lib/utils";

// ─── Types ───
interface WalletState {
  address: string | null;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  chainId: number | null;
  balance: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  hydrated: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  getAuth: () => Promise<{ address: string; signature: string; timestamp: string }>;
}

const WalletContext = createContext<WalletState>({
  address: null,
  signer: null,
  provider: null,
  chainId: null,
  balance: null,
  isConnecting: false,
  isConnected: false,
  error: null,
  hydrated: false,
  connect: async () => {},
  disconnect: () => {},
  getAuth: async () => ({ address: "", signature: "", timestamp: "" }),
});

export function useWallet() {
  return useContext(WalletContext);
}

// ─── Base network ───
const BASE_CHAIN = {
  chainId: "0x2105",
  chainName: "Base",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
};

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

// ─── Provider Component ───
export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const listenersAttached = useRef(false);

  const isConnected = !!address && !!signer;

  // ── Mark hydration complete (NO wallet calls here) ──
  useEffect(() => {
    setHydrated(true);
  }, []);

  // ── Fetch $OPENWORK balance (only called after user action) ──
  const fetchBalance = useCallback(async (addr: string, prov: ethers.BrowserProvider) => {
    try {
      const token = new ethers.Contract(OPENWORK_TOKEN, ERC20_ABI, prov);
      const bal = await token.balanceOf(addr);
      setBalance(ethers.formatEther(bal));
    } catch {
      setBalance(null);
    }
  }, []);

  // ── Setup wallet from ethereum object (called ONLY after user click) ──
  const setupWallet = useCallback(
    async (ethereum: any) => {
      try {
        const prov = new ethers.BrowserProvider(ethereum);
        const sign = await prov.getSigner();
        const addr = await sign.getAddress();
        const network = await prov.getNetwork();

        setProvider(prov);
        setSigner(sign);
        setAddress(addr);
        setChainId(Number(network.chainId));
        setError(null);

        fetchBalance(addr, prov);
      } catch (err: any) {
        console.error("setupWallet error:", err);
        setError(err.message);
      }
    },
    [fetchBalance]
  );

  // ── Attach listeners ONLY after first successful connect ──
  const attachListeners = useCallback(
    (ethereum: any) => {
      if (listenersAttached.current) return;
      listenersAttached.current = true;

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setAddress(null);
          setSigner(null);
          setProvider(null);
          setBalance(null);
        } else {
          setupWallet(ethereum);
        }
      };

      const handleChainChanged = () => {
        setupWallet(ethereum);
      };

      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);
    },
    [setupWallet]
  );

  // ── Connect (ONLY called on user click, never on mount) ──
  const connect = useCallback(async () => {
    if (typeof window === "undefined") return;

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setError("No wallet found. Install MetaMask.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request accounts (opens MetaMask popup)
      await ethereum.request({ method: "eth_requestAccounts" });

      // Switch to Base if needed
      const currentChain = await ethereum.request({ method: "eth_chainId" });
      if (currentChain !== BASE_CHAIN.chainId) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: BASE_CHAIN.chainId }],
          });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [BASE_CHAIN],
            });
          } else {
            throw switchErr;
          }
        }
      }

      await setupWallet(ethereum);
      attachListeners(ethereum);
    } catch (err: any) {
      console.error("connect error:", err);
      setError(err.message || "Connection failed");
    }

    setIsConnecting(false);
  }, [setupWallet, attachListeners]);

  // ── Disconnect ──
  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setProvider(null);
    setChainId(null);
    setBalance(null);
    setError(null);
  }, []);

  // ── Get auth headers for API ──
  const getAuth = useCallback(async () => {
    if (!signer || !address) throw new Error("Wallet not connected");
    const timestamp = Date.now().toString();
    const message = `SkillForge:${timestamp}`;
    const signature = await signer.signMessage(message);
    return { address, signature, timestamp };
  }, [signer, address]);

  return (
    <WalletContext.Provider
      value={{
        address,
        signer,
        provider,
        chainId,
        balance,
        isConnecting,
        isConnected,
        error,
        hydrated,
        connect,
        disconnect,
        getAuth,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}