// The chain this app runs on: Base Sepolia (a test network) by default, and the same chain id on a local anvil fork
// (`npm run chain`, then NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545). Public values only: they ship to every browser.

import { baseSepolia } from "viem/chains";

export const chain = baseSepolia;
export const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";
/** Circle's test USDC on Base Sepolia (also on the fork). */
export const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
/** The Access0x1 router on Base Sepolia: anyone registers a merchant with one transaction (`npm run merchant`). */
export const ROUTER = (process.env.NEXT_PUBLIC_ACCESS0X1_ROUTER || "0xe92244e3368561faf21648146511DeDE3a475EB5") as `0x${string}`;

/** Your Access0x1 merchant id, or null until you set NEXT_PUBLIC_ACCESS0X1_MERCHANT. */
export function merchantId(value = process.env.NEXT_PUBLIC_ACCESS0X1_MERCHANT): bigint | null {
  return value && /^[1-9]\d*$/.test(value.trim()) ? BigInt(value.trim()) : null;
}
