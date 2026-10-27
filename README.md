# GitHat Web3 starter

A small Next.js app where people use their own wallet:

| | Where | |
|---|---|---|
| **Sign in with Ethereum** | `lib/siwe.ts`, `components/wallet-sign-in.tsx`, `app/api/auth/*` | Any injected wallet signs a one-time message (EIP-4361); smart-contract wallets too. No database: a signed session cookie |
| **Wallet payments** | `components/access0x1-pay.tsx` | Access0x1's own pay button (`@access0x1/react`): a USD price paid in USDC, one transaction, to your payout address |
| **Card payments** | `components/sebastn-pay.tsx` | Through SebasTN, to your own Stripe account. You write no payment code |
| **Pay per call (x402 v2)** | `lib/x402.ts`, `app/api/x402/hello` | The x402 Foundation's own packages: an agent or any x402 client pays USDC per request, settled only after your route answers |

MIT licensed: you own every line. Made by [GitHat](https://githat.io).

## Set it up

```bash
npm install
cp .env.example .env.local
```

1. **Sessions.** Set `SESSION_SECRET` to a long random string: `openssl rand -hex 32`.
2. **Sign-in** needs nothing more: it runs on Base Sepolia, a test network.
3. **Wallet payments.** Register as an Access0x1 merchant (anyone can, one transaction):
   `npm run merchant -- --payout 0xYourAddress` prints the command to run from your own wallet, and how to read your
   merchant id. Put it in `NEXT_PUBLIC_ACCESS0X1_MERCHANT`.
4. **Card payments.** At [sebastn.com](https://sebastn.com), connect Stripe and copy your merchant id into
   `NEXT_PUBLIC_SEBASTN_MERCHANT`. Every fee is published there.
5. **Pay per call.** Set `X402_PAY_TO` to your wallet's public address (never a private key).

```bash
npm run dev     # http://localhost:3000
npm run check   # types + tests
```

## Test real payments on your machine (anvil)

Needs [Foundry](https://getfoundry.sh). No faucet and no keys of yours: anvil's printed dev accounts hold local test money.

```bash
npm run chain                    # 1: a local copy of Base Sepolia, the Access0x1 router and test USDC included
npm run merchant -- --local      # 2: registers a merchant, pays it $1 the way the button does, claims it, prints the id
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545 X402_LOCAL_RPC=http://127.0.0.1:8545 \
  NEXT_PUBLIC_ACCESS0X1_MERCHANT=<id from step 2> npm run dev   # 3: the app on the fork
npm run pay -- --local           # 4: an agent pays the x402 route 0.01 USDC, prints the transaction
```

To click through in a browser, add a network to your wallet: RPC `http://127.0.0.1:8545`, chain id `84532`, and import
anvil's second dev account (its key is printed by `npm run chain`; it is public and holds only local test money).

**On Base Sepolia** (leave `X402_LOCAL_RPC` and `NEXT_PUBLIC_RPC_URL` unset): test USDC from
[faucet.circle.com](https://faucet.circle.com), a little test ETH for gas, and pay from your wallet.
`PAYER_KEY=0x… npm run pay` pays the x402 route from a **throwaway** test wallet.

## Add your own

- A paid button: `<Access0x1Pay usd={29} label="Buy" orderId="order-123" />` or `<SebastnPay amount="29.00" label="Buy" />`.
- A paid API route: copy `app/api/x402/hello/route.ts` and change the path and price.
- A page only for signed-in people: `const user = await currentUser()`; `user.sub` is the wallet address.

## Deploy

Any Node host runs it (`npm run build && npm start`). To deploy to your own Cloudflare account from GitHub, set the
repository variable `DEPLOY_TARGET=cloudflare` and the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, then
push to `main` (`.github/workflows/deploy.yml`).

## Good to know

- Everything runs on **Base Sepolia, a test network** until you change it. On Base Sepolia the router credits a
  merchant's share to its lane in PaymentLanes; the merchant takes it with `claim(USDC)` (`npm run merchant -- --local` shows it).
- Pinned to current versions: Next.js 16.4, React 19.3, TypeScript 7, Vitest 5, viem 2.57, x402 2.28.
- Never commit `.env.local` or any key.
