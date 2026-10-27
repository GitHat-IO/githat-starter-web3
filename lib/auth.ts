// THE SIGN-IN SEAM. Pages and routes call `currentUser()`; how people sign in (a wallet today, see lib/siwe.ts and
// app/api/auth) can change here without touching them.

import { cookies } from "next/headers";
import { SESSION_COOKIE, openSession, type Session } from "./session";

export async function currentUser(): Promise<Session | null> {
  return openSession((await cookies()).get(SESSION_COOKIE)?.value);
}
