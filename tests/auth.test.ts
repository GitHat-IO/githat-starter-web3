import { createPublicClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { describe, expect, it } from "vitest";

import { chain } from "../lib/chain";
import { openSession, sealSession } from "../lib/session";
import { checkSignIn } from "../lib/siwe";

const env = { SESSION_SECRET: "x".repeat(32) };

describe("session cookie", () => {
  it("opens what it sealed, and nothing forged, altered or expired", () => {
    const v = sealSession({ sub: "0xabc", exp: 2_000_000_000 }, env);
    expect(openSession(v, env, 1_000)).toEqual({ sub: "0xabc", exp: 2_000_000_000 });
    expect(openSession(v, { SESSION_SECRET: "y".repeat(32) }, 1_000)).toBeNull();
    expect(openSession(v, env, 2_000_000_001)).toBeNull();
    const [data, mac] = v.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "0xevil", exp: 2_000_000_000 })).toString("base64url");
    expect(openSession(`${forged}.${mac}`, env, 1_000)).toBeNull();
    expect(openSession(`${data}.`, env, 1_000)).toBeNull();
  });

  it("refuses a short secret", () => {
    expect(() => sealSession({ sub: "a", exp: 1 }, { SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
  });
});

describe("sign in with Ethereum", () => {
  // A plain wallet's signature is checked without touching the network; an unreachable RPC proves it.
  const offline = createPublicClient({ chain, transport: http("http://127.0.0.1:1") }) as never;
  const account = privateKeyToAccount(generatePrivateKey());
  const now = new Date("2026-10-27T12:00:00Z");
  const message = (over: Partial<Parameters<typeof createSiweMessage>[0]> = {}) =>
    createSiweMessage({ address: account.address, chainId: chain.id, domain: "app.example", uri: "https://app.example", nonce: "abcdefgh12345678", version: "1", expirationTime: new Date(now.getTime() + 600_000), ...over });
  const signIn = async (msg: string, input: { nonce?: string; domain?: string; signer?: typeof account } = {}) =>
    checkSignIn({ message: msg, signature: await (input.signer ?? account).signMessage({ message: msg }), nonce: "nonce" in input ? input.nonce : "abcdefgh12345678", domain: input.domain ?? "app.example" }, offline, now);

  it("signs in the wallet that signed this site's message with this nonce", async () => {
    expect(await signIn(message())).toBe(account.address);
  });

  it("refuses another site, another or missing nonce, an expired message, another chain, or someone else's signature", async () => {
    expect(await signIn(message(), { domain: "evil.example" })).toBeNull();
    expect(await signIn(message(), { nonce: "zzzzzzzz12345678" })).toBeNull();
    expect(await signIn(message(), { nonce: undefined })).toBeNull();
    expect(await signIn(message({ expirationTime: new Date(now.getTime() - 1) }))).toBeNull();
    expect(await signIn(message({ chainId: 1 }))).toBeNull();
    expect(await signIn(message(), { signer: privateKeyToAccount(generatePrivateKey()) })).toBeNull();
  });
});
