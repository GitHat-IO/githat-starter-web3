import { cookies } from "next/headers";
import { generateSiweNonce } from "viem/siwe";
import { NONCE_COOKIE, NONCE_TTL_S } from "../../../../lib/siwe";
import { cookieOptions } from "../../../../lib/session";

// A fresh one-time nonce for the sign-in message, kept in a short httpOnly cookie.
export async function GET(): Promise<Response> {
  const nonce = generateSiweNonce();
  (await cookies()).set(NONCE_COOKIE, nonce, cookieOptions(NONCE_TTL_S));
  return Response.json({ nonce }, { headers: { "Cache-Control": "no-store" } });
}
