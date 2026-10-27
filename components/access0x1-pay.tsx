"use client";

// Wallet payments through Access0x1: the customer pays a USD price in USDC, in one transaction, straight to your
// payout address (the router keeps no money; its published fee is taken in the same transaction). The button is
// Access0x1's own (@access0x1/react); this file only connects the customer's wallet to it.

import { PayButton, clientFromViem, type Access0x1Client, type PaymentReceipt } from "@access0x1/react";
import { useState } from "react";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { ROUTER, USDC, chain, merchantId, rpcUrl } from "../lib/chain";
import { injected } from "./wallet-sign-in";

export function Access0x1Pay(props: { usd: number; label: string; orderId?: string }) {
  const id = merchantId();
  const [client, setClient] = useState<Access0x1Client>();
  const [paid, setPaid] = useState<PaymentReceipt>();
  const [error, setError] = useState<string | null>(null);

  if (!id) return <p>Wallet payments are not set up yet: register a merchant (README, step 3) and set NEXT_PUBLIC_ACCESS0X1_MERCHANT.</p>;

  async function connect() {
    const ethereum = injected();
    if (!ethereum) return setError("No wallet in this browser.");
    const [account] = await createWalletClient({ chain, transport: custom(ethereum) }).requestAddresses();
    const wallet = createWalletClient({ account, chain, transport: custom(ethereum) });
    const reader = createPublicClient({ chain, transport: http(rpcUrl) });
    setClient(clientFromViem(reader as never, wallet as never));
  }

  if (paid) return <p>Paid. Transaction {paid.txHash}.</p>;
  if (!client) {
    return (
      <>
        <button type="button" onClick={() => connect().catch((e: Error) => setError(e.message))}>Connect a wallet to pay ${props.usd.toFixed(2)}</button>
        {error && <p role="alert">{error}</p>}
      </>
    );
  }
  return (
    <PayButton
      merchantId={id}
      usdAmount={props.usd}
      token={USDC}
      routerAddress={ROUTER}
      client={client}
      label={props.label}
      orderId={props.orderId}
      explorerBaseUrl="https://sepolia.basescan.org"
      onSuccess={setPaid}
    />
  );
}
