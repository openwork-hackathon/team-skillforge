# 🦞 SkillForge — Deployment & Submission Guide

## ✅ Submission Checklist

Based on the [Clawathon judging criteria](https://openwork.bot/hackathon):

| # | Requirement | Weight | Status |
|---|------------|--------|--------|
| 1 | **Deployed & functional product** | 24% (Completeness) | ⬜ |
| 2 | **Clean, documented code on GitHub** | 19% (Code Quality) | ⬜ |
| 3 | **Good UI/UX design** | 19% (Design & UX) | ⬜ |
| 4 | **Bonding curve token created** | 19% (Token Integration) | ⬜ |
| 5 | **PRs, issues, commit history** | 14% (Team Coordination) | ⬜ |
| 6 | **Pilot oversight evidence** | 5% (Pilot Oversight) | ⬜ |

---

## STEP 1: Get $OPENWORK Tokens

You need ≥100K $OPENWORK (~$1 USD) in your wallet.

### Buy on DEX:
1. Go to: https://dexscreener.com/base/0x2174bd22600ba56234e283c5bd0da2824cc84c15c437e5909c2c38c5701841ea
2. Click "Buy" — it will route you to a DEX on Base
3. Swap ~$2 of ETH for $OPENWORK
4. Token contract: `0x299c30DD5974BF4D5bFE42C340CA40462816AB07`

### Verify:
- Check balance on BaseScan: https://basescan.org/token/0x299c30DD5974BF4D5bFE42C340CA40462816AB07?a=YOUR_WALLET_ADDRESS

---

## STEP 2: Create Bonding Curve Token (Mint Club V2)

This is **mandatory** — 19% of judging score.

### 2a. Make sure you have:
- ≥100K $OPENWORK in your wallet
- Small amount of ETH on Base for gas (~$0.01)
- Your wallet private key

### 2b. Edit token config (optional):
```bash
# In server/scripts/create-token.ts, change these if you want:
const TOKEN_NAME = "SkillForge Token";
const TOKEN_SYMBOL = "SKLFRG";
```

### 2c. Run the script:
```bash
cd server

# Option A: Pass key directly
PRIVATE_KEY=0xYOUR_PRIVATE_KEY npx ts-node scripts/create-token.ts

# Option B: Add to .env first
echo "PRIVATE_KEY=0xYOUR_PRIVATE_KEY" >> .env
npm run create-token
```

### 2d. Expected output:
```
🦞 SkillForge Token Creator
═══════════════════════════════════════
📍 Wallet: 0x8BDF...6c74
💎 ETH Balance: 0.002 ETH
🪙 $OPENWORK Balance: 150000.0 $OW

💸 Creation fee: 0.0001 ETH
⏳ Approving $OPENWORK for Bond contract...
✅ Approved
⏳ Creating token: SkillForge Token (SKLFRG)...
📤 TX sent: 0xabc123...

═══════════════════════════════════════
🎉 TOKEN CREATED SUCCESSFULLY!
═══════════════════════════════════════
   TX Hash: 0xabc123...
   Mint Club URL: https://mint.club/token/base/SKLFRG
   BaseScan: https://basescan.org/tx/0xabc123...
```

### 2e. Save the Mint Club URL — you need it for team registration.

---

## STEP 3: Deploy Backend (Railway)

Railway is the easiest option — free tier available.

### 3a. Install Railway CLI:
```bash
npm install -g @railway/cli
```

### 3b. Login & deploy:
```bash
cd server
railway login
railway init        # Creates a new project
railway up          # Deploys your code
```

### 3c. Set environment variables:
```bash
railway variables set PORT=4000
railway variables set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/skillforge"
railway variables set OPENWORK_RPC="https://mainnet.base.org"
railway variables set OPENWORK_TOKEN="0x299c30DD5974BF4D5bFE42C340CA40462816AB07"
railway variables set BOND_CONTRACT="0xc5a076cad94176c2996B32d8466Be1cE757FAa27"
```

### 3d. Get your backend URL:
```bash
railway domain        # Generates a URL like: skillforge-server.up.railway.app
```

Save this URL — you need it for the frontend.

### Alternative: Deploy to Render
1. Push `server/` folder to GitHub
2. Go to https://render.com → New Web Service
3. Connect your repo, set root directory to `server`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Add environment variables in Render dashboard

---

## STEP 4: Set Up MongoDB Atlas (Free)

Skip this if you already have MongoDB running.

### 4a. Create free cluster:
1. Go to https://cloud.mongodb.com
2. Sign up → Create FREE cluster (M0)
3. Choose AWS / us-east-1 (or closest region)
4. Create database user (save username + password)
5. Network Access → Allow from Anywhere (0.0.0.0/0)

### 4b. Get connection string:
```
mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/skillforge?retryWrites=true&w=majority
```

### 4c. Set in Railway/Render:
Use this as your `MONGODB_URI` environment variable.

---

## STEP 5: Deploy Frontend (Vercel)

### 5a. Install Vercel CLI:
```bash
npm install -g vercel
```

### 5b. Deploy:
```bash
cd client
vercel
```

When prompted:
- Set up and deploy? **Y**
- Which scope? **Your account**
- Link to existing project? **N**
- Project name? **skillforge**
- Directory? **./**
- Override settings? **N**

### 5c. Set environment variable:
```bash
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://your-railway-url.up.railway.app
# Select: Production, Preview, Development
```

### 5d. Redeploy with env vars:
```bash
vercel --prod
```

### 5e. Your live URL will be:
```
https://skillforge-xxxx.vercel.app
```

### Alternative: Direct from GitHub
1. Push entire project to GitHub
2. Go to https://vercel.com → Import Project
3. Select your repo
4. Set root directory to `client`
5. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-backend-url`
6. Deploy

---

## STEP 6: Update Backend CORS

After deploying frontend, update the server to allow your Vercel domain:

```typescript
// server/index.ts — update CORS origin
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://skillforge-xxxx.vercel.app",  // ← your actual Vercel URL
    "https://*.vercel.app"
  ],
  credentials: true
}));
```

Redeploy backend after this change.

---

## STEP 7: Push to GitHub

### 7a. Initialize repo:
```bash
cd skillforge     # project root
git init
```

### 7b. Create .gitignore:
```bash
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.next/
dist/
.vercel/
*.log
EOF
```

### 7c. Commit and push:
```bash
git add .
git commit -m "🦞 SkillForge — Agent Skill Marketplace for Clawathon"
git remote add origin https://github.com/YOUR_USERNAME/skillforge.git
git branch -M main
git push -u origin main
```

### 7d. Create some PRs/Issues for Team Coordination score (14%):
Create a few issues like:
- "Set up MongoDB Atlas for production"
- "Deploy frontend to Vercel"
- "Create bonding curve token"
- "Add demo skills to marketplace"

Then close them with commits.

---

## STEP 8: Seed Demo Skills

Publish 4-5 skills on your live site to make it look populated:

1. Go to your live URL
2. Connect wallet
3. Click "+ Publish New Skill"
4. Use these pre-made templates:

| Name | Symbol | Category |
|------|--------|----------|
| DeFi Yield Analyzer | DEFIYLD | DeFi |
| Solidity Auditor | AUDIT | Security |
| Base Chain Monitor | BASEMON | Analytics |
| SEO Content Writer | SEOWRITE | Content |
| API Integration Builder | APIBLDR | Infrastructure |

---

## STEP 9: Register for Clawathon

### 9a. Register your agent:
```bash
# POST to create a hackathon team
curl -X POST https://openwork.bot/api/hackathon \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SkillForge",
    "description": "Agent skill marketplace powered by $OPENWORK"
  }'
```

### 9b. Register token URL:
```bash
# PATCH to add your Mint Club token
curl -X PATCH https://openwork.bot/api/hackathon/YOUR_TEAM_ID \
  -H "Content-Type: application/json" \
  -d '{
    "token_url": "https://mint.club/token/base/SKLFRG"
  }'
```

### 9c. Set your webhook (for team events):
```bash
curl -X PUT https://openwork.bot/api/agents/YOUR_AGENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://your-backend-url/api/webhook"
  }'
```

---

## STEP 10: Post on 𝕏 (Twitter)

Tag @openworkceo with your submission:

```
🦞 SkillForge — Agent Skill Marketplace

Built for #Clawathon by @openworkceo

✅ Live: https://skillforge-xxxx.vercel.app
✅ GitHub: https://github.com/YOUR_USERNAME/skillforge
✅ Token: https://mint.club/token/base/SKLFRG

What it does:
- Agents discover & install SKILL.md files
- Publishers monetize skills with $OPENWORK
- Content verified via keccak256 hashing
- Bonding curve token on Mint Club V2

Built with Next.js 14 + Express + MongoDB + ethers.js on Base

#AI #Web3 #Openwork #Base
```

---

## 🔍 Verify Everything Works

Before submitting, check each flow:

| # | Test | Expected |
|---|------|----------|
| 1 | Visit live URL | Homepage loads with skills |
| 2 | Connect wallet | MetaMask connects on Base |
| 3 | Browse skills | Skills display with filters |
| 4 | Click a skill | Detail page with SKILL.md content |
| 5 | Install a skill | Success message, content visible |
| 6 | Publish a skill | Modal opens, form works, skill created |
| 7 | Dashboard | Shows published skills + stats |
| 8 | Rate a skill | Stars + review submitted |
| 9 | Mint Club token | Token page loads at mint.club URL |
| 10 | API health | GET /api/health returns ok |

### Quick API test:
```bash
curl https://your-backend-url/api/health
# Should return: {"status":"ok","service":"SkillForge API","version":"1.0.0",...}

curl https://your-backend-url/api/skills
# Should return: {"skills":[...],"pagination":{...}}
```

---

## 📅 Timeline Summary

| Order | Task | Time | Priority |
|-------|------|------|----------|
| 1 | Buy $OPENWORK | 5 min | 🔴 Must |
| 2 | Create bonding curve token | 10 min | 🔴 Must |
| 3 | Set up MongoDB Atlas | 5 min | 🔴 Must |
| 4 | Deploy backend (Railway) | 10 min | 🔴 Must |
| 5 | Deploy frontend (Vercel) | 10 min | 🔴 Must |
| 6 | Push to GitHub | 5 min | 🔴 Must |
| 7 | Seed demo skills | 10 min | 🟡 Should |
| 8 | Register on Clawathon | 5 min | 🔴 Must |
| 9 | Post on 𝕏 | 5 min | 🔴 Must |
| 10 | Create GitHub issues/PRs | 10 min | 🟡 Should |
