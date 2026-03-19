import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  type Hash,
  type PublicClient,
  type WalletClient,
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

// ── Base Sepolia (primary) ──
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
});

export const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
});

// ── Celo Sepolia (secondary) ──
export const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.CELO_SEPOLIA_RPC_URL || "https://celo-sepolia.drpc.org"] },
  },
  blockExplorers: {
    default: { name: "Celoscan", url: "https://celo-sepolia.celoscan.io" },
  },
});

export const celoPublicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(process.env.CELO_SEPOLIA_RPC_URL || "https://celo-sepolia.drpc.org"),
});

export const celoWalletClient = createWalletClient({
  account,
  chain: celoSepolia,
  transport: http(process.env.CELO_SEPOLIA_RPC_URL || "https://celo-sepolia.drpc.org"),
});

/**
 * Send a contract write tx with retry on nonce errors.
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

export async function sendTxAndWaitCelo(params: any, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const hash = await celoWalletClient.writeContract(params);
      const receipt = await celoPublicClient.waitForTransactionReceipt({ hash });
      return receipt;
    } catch (err: any) {
      const msg = err?.details || err?.message || "";
      const isRetryable = msg.includes("nonce") || msg.includes("underpriced") || msg.includes("already known");
      if (isRetryable && attempt < retries - 1) {
        const delay = 5000 + attempt * 2000;
        console.log(`  [celo-tx] ${msg.slice(0, 40)}... retrying in ${delay/1000}s (${attempt + 2}/${retries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("sendTxAndWaitCelo: max retries exceeded");
}

export { baseSepolia };
