import { ethers } from "ethers";

const RPC_URL = process.env.OPENWORK_RPC || "https://mainnet.base.org";
const OPENWORK_TOKEN = process.env.OPENWORK_TOKEN || "0x299c30DD5974BF4D5bFE42C340CA40462816AB07";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

let provider: ethers.JsonRpcProvider;

export function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

export function getOpenworkContract() {
  return new ethers.Contract(OPENWORK_TOKEN, ERC20_ABI, getProvider());
}

/**
 * Check $OPENWORK balance for an address
 */
export async function getBalance(address: string): Promise<string> {
  const contract = getOpenworkContract();
  const balance = await contract.balanceOf(address);
  return ethers.formatEther(balance);
}

/**
 * Verify a payment transaction
 * Checks that a tx sent $OPENWORK from buyer to the expected recipient
 */
export async function verifyPayment(
  txHash: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: bigint
): Promise<boolean> {
  try {
    const p = getProvider();
    const receipt = await p.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) return false;

    const contract = getOpenworkContract();
    const transferEvents = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog({ topics: [...log.topics], data: log.data });
        } catch {
          return null;
        }
      })
      .filter((e) => e?.name === "Transfer");

    return transferEvents.some((event) => {
      if (!event) return false;
      const from = event.args[0].toLowerCase();
      const to = event.args[1].toLowerCase();
      const value = event.args[2];
      return (
        from === expectedFrom.toLowerCase() &&
        to === expectedTo.toLowerCase() &&
        value >= expectedAmount
      );
    });
  } catch (err) {
    console.error("Payment verification failed:", err);
    return false;
  }
}

/**
 * Hash SKILL.md content for on-chain verification
 */
export function hashContent(content: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(content));
}