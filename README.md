# 🚀 StarkHub — Unified Web3 Ecosystem (Messaging + DeFi + AI)

StarkHub is a next-generation Web3 communication and financial platform built on Starknet.

It enables users to chat, manage DeFi protocols, and interact with the **StarkAgent** cognitive terminal using only their wallet.

---

## ✨ Features

- 💬 Wallet-to-Wallet Chat (no signup)
- 💸 Send & Receive Crypto (Starknet)
- 🔒 Pay-to-Unlock Messages & Media
- 🎤 Voice Messages (Supabase Storage)
- 🖼️ Locked Image / Media Sharing
- ⚡ Realtime Messaging (Supabase Realtime)
- 🤖 Command-Based Agent (optional)

---

## 🧠 Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Database + Realtime + Storage)
- Starknet + Starkzap (wallet + payments)

---

## ⚙️ Getting Started

1. Clone the repo

```bash
git clone https://github.com/shuhaib90/starkchat.git
cd starkchat
```

---

2. Install dependencies

```bash
npm install
```

---

3. Setup environment variables

Create ".env.local":

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Starknet Configuration
# Recommended: Use Alchemy or a private RPC for stability
NEXT_PUBLIC_STARKNET_RPC_URL=your_starknet_rpc_url

# AI Agent Configuration
NEXT_PUBLIC_GEMINI_KEY=your_gemini_api_key
```

---

4. Run development server

```bash
npm run dev
```

Open http://localhost:3000

---

## 🔗 How it works

1. Connect wallet (Starknet)
2. Start chat using wallet address
3. Send:
   - text
   - voice
   - crypto
   - locked content
4. Unlock content via payment
5. Messages update in realtime

---

## 🔐 Architecture

- Chat → Supabase Realtime
- Storage → Supabase Storage
- Payments → Starknet (Starkzap)
- Identity → Wallet Address

---

## ⚠️ Important Notes

- No private keys are stored
- Messages are off-chain (fast + scalable)
- Payments are on-chain (secure)
- **Note**: Braavos wallet transfers are currently experiencing issues on Mainnet. Please use Argent X or OKX wallet for transfers in the meantime.

---

## 🚀 Deployment

Deploy easily using Vercel:

```bash
vercel
```

Make sure to add environment variables in Vercel dashboard.

---

## 🎯 Vision

StarkHub aims to become a Web3 super app combining:

- communication
- payments
- content monetization

---

## 🏆 Demo

🏆 Demo: [https://starkhub.vercel.app/](https://starkhub.vercel.app/)

---

## 👨‍💻 Author

Built by Zenvic

---

## ⭐ Future Plans

- 👥 **Group Messaging**: Create decentralized chat rooms for multiple participants.
- 🆔 **Starknet ID Support**: Integration with human-readable addresses (e.g., `user.stark`).
- 🔐 **End-to-End Encryption**: Implementing E2EE for all off-chain message payloads.
- 🎫 **Token-Gating**: Exclusive rooms accessible only to holders of specific NFTs or tokens.
- 📱 **Mobile PWA**: Optimized progressive web app for a seamless mobile chat experience.

---
