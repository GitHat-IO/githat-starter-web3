"use client";

// Sign in with Ethereum: the wallet signs a one-time message for this site (lib/siwe.ts checks it on the server).
// Works with any injected wallet (MetaMask, Coinbase Wallet, Rabby, ...); no wallet library needed.

import { useState } from "react";
import { createWalletClient, custom, type EIP1193Provider } from "viem";
import { createSiweMessage } from "viem/siwe";
import { chain } from "../lib/chain";

export const injected = () => (globalThis as { ethereum?: EIP1193Provider }).ethereum;

export function WalletSignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    const ethereum = injected();
    if (!ethereum) return setError("No wallet in this browser. Add one (MetaMask, Coinbase Wallet, Rabby) and try again.");
    setBusy(true);
    setError(null);
    try {
      const wallet = createWalletClient({ chain, transport: custom(ethereum) });
      const [address] = await wallet.requestAddresses();
      const { nonce } = (await (await fetch("/api/auth/nonce", { cache: "no-store" })).json()) as { nonce: string };
      const message = createSiweMessage({
        address,
        chainId: chain.id,
        domain: location.host,
        uri: location.origin,
        nonce,
        version: "1",
        statement: "Sign in to this app. This costs nothing and sends no transaction.",
        expirationTime: new Date(Date.now() + 10 * 60_000),
      });
      const signature = await wallet.signMessage({ account: address, message });
      const res = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, signature }) });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Sign-in failed.");
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={signIn} disabled={busy}>{busy ? "Check your wallet…" : "Sign in with your wallet"}</button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
