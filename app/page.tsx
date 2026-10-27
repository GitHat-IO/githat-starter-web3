import { Access0x1Pay } from "../components/access0x1-pay";
import { SebastnPay } from "../components/sebastn-pay";
import { WalletSignIn } from "../components/wallet-sign-in";
import { currentUser } from "../lib/auth";

export default async function Home() {
  const user = await currentUser();
  return (
    <main style={{ maxWidth: 640, margin: "4rem auto", padding: "0 1rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>
      <h1>Your app is ready.</h1>

      <h2>Sign in</h2>
      {user ? (
        <form method="post" action="/api/auth/logout">
          <p>Signed in as <code>{user.sub}</code>.</p>
          <button type="submit">Sign out</button>
        </form>
      ) : (
        <WalletSignIn />
      )}

      <h2>Take a wallet payment</h2>
      <p>USDC through Access0x1, straight to your payout address in one transaction.</p>
      <Access0x1Pay usd={1} label="Pay $1 in USDC" />

      <h2>Take a card payment</h2>
      <p>Through SebasTN, straight to your Stripe account. You write no payment code.</p>
      <SebastnPay amount="5.00" label="Pay $5" />

      <h2>Get paid per call (x402)</h2>
      <p>
        <code>GET /api/x402/hello</code> answers 402 with what to pay; an agent or any x402 client pays 0.01 test USDC on
        Base Sepolia and gets the answer. Copy that route for your own paid endpoints.
      </p>
    </main>
  );
}
