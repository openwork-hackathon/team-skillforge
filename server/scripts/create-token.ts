import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// ─── Config ───
const RPC_URL = "https://mainnet.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Mint Club V2 contracts on Base (from Clawathon SKILL.md §10)
const BOND_ADDRESS = "0xc5a076cad94176c2996B32d8466Be1cE757FAa27";
const OPENWORK_TOKEN = "0x299c30DD5974BF4D5bFE42C340CA40462816AB07";

// ─── Your token config (EDIT THESE) ───
const TOKEN_NAME = "SkillForge Token";
const TOKEN_SYMBOL = "SKLFRG";
const MAX_SUPPLY = ethers.parseEther("1000000"); // 1M tokens

// Bonding curve: 3-step pricing
const STEP_RANGES = [
  ethers.parseEther("100000"),  // first 100K tokens
  ethers.parseEther("500000"),  // next 400K tokens
  ethers.parseEther("1000000"), // final 500K tokens
];
const STEP_PRICES = [
  ethers.parseEther("0.001"),   // 0.001 $OW per token
  ethers.parseEther("0.005"),   // 0.005 $OW per token
  ethers.parseEther("0.01"),    // 0.01 $OW per token
];
const MINT_ROYALTY = 100;  // 1% (basis points)
const BURN_ROYALTY = 100;  // 1%

// ─── ABIs ───
const BOND_ABI = [
  "function createToken((string name, string symbol) tokenParams, (uint16 mintRoyalty, uint16 burnRoyalty, address reserveToken, uint128 maxSupply, uint128[] stepRanges, uint128[] stepPrices) bondParams) external payable returns (address)",
  "function creationFee() view returns (uint256)",
  "function mint(address token, uint256 tokensToMint, uint256 maxReserveAmount, address receiver) external",
  "function burn(address token, uint256 tokensToBurn, uint256 minRefund, address receiver) external",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌ Set PRIVATE_KEY env variable");
    console.log("   PRIVATE_KEY=0x... npx ts-node scripts/create-token.ts");
    process.exit(1);
  }

  console.log("🦞 SkillForge Token Creator");
  console.log("═══════════════════════════════════════");

  // 1. Setup
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const address = await signer.getAddress();

  console.log(`\n📍 Wallet: ${address}`);

  // 2. Check balances
  const ethBalance = await provider.getBalance(address);
  console.log(`💎 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  const openwork = new ethers.Contract(OPENWORK_TOKEN, ERC20_ABI, signer);
  const owBalance = await openwork.balanceOf(address);
  console.log(`🪙 $OPENWORK Balance: ${ethers.formatEther(owBalance)} $OW`);

  if (ethBalance === 0n) {
    console.error("\n❌ No ETH on Base. You need ~$0.01 for gas + creation fee.");
    console.log("   Bridge ETH via https://bridge.base.org");
    process.exit(1);
  }

  // 3. Check creation fee
  const bond = new ethers.Contract(BOND_ADDRESS, BOND_ABI, signer);
  const creationFee = await bond.creationFee();
  console.log(`\n💸 Creation fee: ${ethers.formatEther(creationFee)} ETH`);

  if (ethBalance < creationFee) {
    console.error(`❌ Not enough ETH. Need ${ethers.formatEther(creationFee)} ETH for creation fee.`);
    process.exit(1);
  }

  // 4. Approve $OPENWORK spend
  console.log("\n⏳ Approving $OPENWORK for Bond contract...");
  const currentAllowance = await openwork.allowance(address, BOND_ADDRESS);
  if (currentAllowance < ethers.MaxUint256 / 2n) {
    const approveTx = await openwork.approve(BOND_ADDRESS, ethers.MaxUint256);
    await approveTx.wait();
    console.log("✅ Approved");
  } else {
    console.log("✅ Already approved");
  }

  // 5. Create token
  console.log(`\n⏳ Creating token: ${TOKEN_NAME} (${TOKEN_SYMBOL})...`);
  console.log(`   Max supply: ${ethers.formatEther(MAX_SUPPLY)} tokens`);
  console.log(`   Bonding curve: 3 steps`);
  console.log(`   Reserve token: $OPENWORK`);
  console.log(`   Royalties: ${MINT_ROYALTY / 100}% mint / ${BURN_ROYALTY / 100}% burn`);

  const tx = await bond.createToken(
    {
      name: TOKEN_NAME,
      symbol: TOKEN_SYMBOL,
    },
    {
      mintRoyalty: MINT_ROYALTY,
      burnRoyalty: BURN_ROYALTY,
      reserveToken: OPENWORK_TOKEN,
      maxSupply: MAX_SUPPLY,
      stepRanges: STEP_RANGES,
      stepPrices: STEP_PRICES,
    },
    { value: creationFee }
  );

  console.log(`\n📤 TX sent: ${tx.hash}`);
  console.log("   Waiting for confirmation...");

  const receipt = await tx.wait();

  if (receipt && receipt.status === 1) {
    console.log("\n═══════════════════════════════════════");
    console.log("🎉 TOKEN CREATED SUCCESSFULLY!");
    console.log("═══════════════════════════════════════");
    console.log(`   TX Hash: ${receipt.hash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Mint Club URL: https://mint.club/token/base/${TOKEN_SYMBOL}`);
    console.log(`   BaseScan: https://basescan.org/tx/${receipt.hash}`);
    console.log("\n📋 Next: Register with your Clawathon team:");
    console.log(`   PATCH /api/hackathon/:id`);
    console.log(`   {"token_url": "https://mint.club/token/base/${TOKEN_SYMBOL}"}`);
  } else {
    console.error("❌ Transaction failed. Check BaseScan for details.");
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});

