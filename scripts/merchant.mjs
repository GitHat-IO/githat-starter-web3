// Become an Access0x1 merchant (anyone can, with one transaction) and see a wallet payment go through.
//
//   npm run merchant -- --local
//       On the anvil fork (`npm run chain`): registers anvil's third dev account as a merchant, pays it $1 in USDC from
//       anvil's second dev account exactly as the pay button does (quote, approve, payToken), then claims the money and
//       prints every step. Put the printed merchant id in NEXT_PUBLIC_ACCESS0X1_MERCHANT.
//
//   npm run merchant -- --payout 0xYourAddress
//       Base Sepolia: prints the one command to register from YOUR wallet (Foundry keystore; this script never sees a key).

import { createPublicClient, createWalletClient, encodeAbiParameters, http, keccak256, parseAbi, zeroAddress, zeroHash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const ROUTER = process.env.NEXT_PUBLIC_ACCESS0X1_ROUTER || "0xe92244e3368561faf21648146511DeDE3a475EB5";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const REGISTERED = "0xb2f2bd3ca7855d65dec4248643b722cee4f4bb412df450060f8b1d0504ce9ddf"; // MerchantRegistered(uint256 indexed id, ...)
const args = process.argv.slice(2);
const at = args.indexOf("--payout");

if (!args.includes("--local")) {
  const payout = at >= 0 ? args[at + 1] : "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(payout ?? "")) throw new Error("Give your payout address: npm run merchant -- --payout 0x...");
  console.log(`Run from your own wallet (a Foundry keystore account holding a little Base Sepolia ETH):

  cast send ${ROUTER} "registerMerchant(address,address,uint16,bytes32)" ${payout} ${zeroAddress} 0 ${zeroHash} \\
    --account <your keystore name> --rpc-url https://sepolia.base.org

Your merchant id is the second topic of the MerchantRegistered log in that transaction:

  cast receipt <transaction> --rpc-url https://sepolia.base.org --json | jq -r '.logs[] | select(.topics[0]=="${REGISTERED}") | .topics[1]' | cast to-dec`);
  process.exit(0);
}

// Anvil's printed dev accounts: local test money only. Never use these keys on a real network.
const merchant = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
const buyer = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const transport = http("http://127.0.0.1:8545");
const chain = createPublicClient({ chain: baseSepolia, transport });
const as = (account) => createWalletClient({ account, chain: baseSepolia, transport });
const router = parseAbi([
  "function registerMerchant(address payout, address feeRecipient, uint16 feeBps, bytes32 nameHash) returns (uint256)",
  "function quote(uint256 merchantId, address token, uint256 usdAmount8) view returns (uint256)",
  "function payToken(uint256 merchantId, address token, uint256 usdAmount8, bytes32 orderId)",
  "function paymentLanes() view returns (address)",
]);
const erc20 = parseAbi(["function approve(address, uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"]);
const lanesAbi = parseAbi(["function claim(address asset)"]);
const mined = async (hash) => {
  const r = await chain.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`reverted: ${hash}`);
  return r;
};
const usdc = (a) => chain.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [a] });
const dollars = (units) => (Number(units) / 1e6).toFixed(6);

if ((await chain.getChainId()) !== baseSepolia.id) throw new Error("Start the fork first: npm run chain");

const reg = await mined(await as(merchant).writeContract({ address: ROUTER, abi: router, functionName: "registerMerchant", args: [merchant.address, zeroAddress, 0, zeroHash] }));
const id = BigInt(reg.logs.find((l) => l.topics[0] === REGISTERED).topics[1]);
console.log(`registered merchant ${id} (payout ${merchant.address})`);

// The buyer gets 10 test USDC (USDC keeps balances in storage slot 9), then pays $1 like the button does.
const slot = keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [buyer.address, 9n]));
await chain.request({ method: "anvil_setStorageAt", params: [USDC, slot, `0x${(10_000_000n).toString(16).padStart(64, "0")}`] });
const usd8 = 100_000_000n; // $1.00 with 8 decimals
const gross = await chain.readContract({ address: ROUTER, abi: router, functionName: "quote", args: [id, USDC, usd8] });
await mined(await as(buyer).writeContract({ address: USDC, abi: erc20, functionName: "approve", args: [ROUTER, gross] }));
const pay = await mined(await as(buyer).writeContract({ address: ROUTER, abi: router, functionName: "payToken", args: [id, USDC, usd8, keccak256("0x01")] }));
console.log(`paid $1.00 = ${dollars(gross)} USDC, transaction ${pay.transactionHash}`);

// Where the router sends the merchant's share: straight to the payout address, or (when this router has a lanes
// contract, as on Base Sepolia) into the merchant's lane, which the merchant claims.
const lanes = await chain.readContract({ address: ROUTER, abi: router, functionName: "paymentLanes" });
const before = await usdc(merchant.address);
if (lanes !== zeroAddress) await mined(await as(merchant).writeContract({ address: lanes, abi: lanesAbi, functionName: "claim", args: [USDC] }));
console.log(`merchant received ${dollars((await usdc(merchant.address)) - before)} USDC${lanes !== zeroAddress ? " (claimed from its lane)" : ""}`);
console.log(`\nNEXT_PUBLIC_ACCESS0X1_MERCHANT=${id}`);
