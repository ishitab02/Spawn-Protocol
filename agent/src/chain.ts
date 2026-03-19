import {
  createPublicClient,
  createWalletClient,
  http,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY not set in .env");
}

export const account = privateKeyToAccount(PRIVATE_KEY);

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
});

export const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
});

/**
 * Send a contract write tx with retry on nonce errors.
 * Waits 3s between retries to let the RPC sync.
 */
export async function sendTxAndWait(params: any, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const hash = await walletClient.writeContract(params);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return receipt;
    } catch (err: any) {
      const msg = err?.details || err?.message || "";
      const isRetryable = msg.includes("nonce") || msg.includes("underpriced") || msg.includes("already known");
      if (isRetryable && attempt < retries - 1) {
        const delay = 5000 + attempt * 2000;
        console.log(`  [tx] ${msg.slice(0, 40)}... retrying in ${delay/1000}s (${attempt + 2}/${retries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("sendTxAndWait: max retries exceeded");
}

export { baseSepolia };
