// Sign in with Ethereum (EIP-4361), checked with viem. The wallet signs a message naming this site, a one-time nonce
// and an expiry; the server checks the signature (smart-contract wallets too: ERC-1271 and ERC-6492), the site, the
// nonce and the time. No database: the nonce lives in a short httpOnly cookie and is spent on the first try.

import { createPublicClient, http, isAddress, type Address, type Hex } from "viem";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import { chain, rpcUrl } from "./chain";

export const NONCE_COOKIE = "siwe_nonce";
export const NONCE_TTL_S = 10 * 60;

type Client = Parameters<typeof verifySiweMessage>[0];
const defaultClient = () => createPublicClient({ chain, transport: http(rpcUrl) }) as unknown as Client;

/** The signed-in address, or null when the message, the signature, the site, the nonce or the time is wrong. */
export async function checkSignIn(
  input: { message: string; signature: Hex; nonce: string | undefined; domain: string },
  client: Client = defaultClient(),
  now = new Date(),
): Promise<Address | null> {
  if (!input.nonce) return null;
  const fields = parseSiweMessage(input.message);
  if (!fields.address || !isAddress(fields.address) || fields.chainId !== chain.id) return null;
  const ok = await verifySiweMessage(client, { message: input.message, signature: input.signature, domain: input.domain, nonce: input.nonce, time: now }).catch(() => false);
  return ok ? fields.address : null;
}
