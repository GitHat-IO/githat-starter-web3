import { cookies } from "next/headers";
import { NONCE_COOKIE, checkSignIn } from "../../../../lib/siwe";
import { SESSION_COOKIE, SESSION_TTL_S, cookieOptions, sealSession } from "../../../../lib/session";

// Checks the signed sign-in message and starts a session. The nonce is spent either way.
export async function POST(request: Request): Promise<Response> {
  const jar = await cookies();
  const nonce = jar.get(NONCE_COOKIE)?.value;
  jar.delete(NONCE_COOKIE);
  const body = (await request.json().catch(() => null)) as { message?: unknown; signature?: unknown } | null;
  if (typeof body?.message !== "string" || typeof body.signature !== "string" || !body.signature.startsWith("0x")) {
    return Response.json({ error: "Send { message, signature }." }, { status: 400 });
  }
  const domain = request.headers.get("host") ?? "";
  const address = await checkSignIn({ message: body.message, signature: body.signature as `0x${string}`, nonce, domain });
  if (!address) return Response.json({ error: "That sign-in did not check out. Try again." }, { status: 401 });
  jar.set(SESSION_COOKIE, sealSession({ sub: address, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S }), cookieOptions(SESSION_TTL_S));
  return Response.json({ address });
}
