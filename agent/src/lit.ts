import { LitNodeClientNodeJs } from "@lit-protocol/lit-node-client-nodejs";
import {
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitAccessControlConditionResource,
} from "@lit-protocol/auth-helpers";
import { LIT_ABILITY } from "@lit-protocol/constants";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

// TimeLock contract deployed on Base Sepolia (from broadcast/DeployMultiDAO.s.sol)
const TIMELOCK_CONTRACT_ADDRESS = "0xb91f936aCd6c9fcdd71C64b57e4e92bb6db7DD23";
const BASE_SEPOLIA_CHAIN_ID = 84532;
const LIT_CHAIN = "baseSepolia" as const;

let litNodeClient: LitNodeClientNodeJs | null = null;

/**
 * Build evmContractConditions that gate decryption on
 * TimeLock.isAfterTimestamp(proposalEndTime) returning true.
 */
function buildTimeLockConditions(proposalEndTime: bigint) {
  return [
    {
      contractAddress: TIMELOCK_CONTRACT_ADDRESS,
      chain: LIT_CHAIN,
      functionName: "isAfterTimestamp",
      functionParams: [proposalEndTime.toString()],
      functionAbi: {
        name: "isAfterTimestamp",
        inputs: [{ name: "timestamp", type: "uint256" }],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view" as const,
        type: "function" as const,
      },
      returnValueTest: {
        key: "",
        comparator: "=" as const,
        value: "true",
      },
    },
  ];
}

/**
 * Get an ethers Wallet signer from the deployer private key.
 */
function getEthersSigner(): ethers.Wallet {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not set in .env");
  }
  return new ethers.Wallet(privateKey);
}

/**
 * Generate session signatures for the Lit network using an AuthSig
 * derived from the deployer wallet.
 */
async function getSessionSigs(
  client: LitNodeClientNodeJs,
  evmContractConditions: any[]
) {
  const ethersSigner = getEthersSigner();
  const address = await ethersSigner.getAddress();

  const latestBlockhash = await client.getLatestBlockhash();

  // Create a SIWE message with the required resource capabilities
  const resourceAbilityRequests = [
    {
      resource: new LitAccessControlConditionResource("*"),
      ability: LIT_ABILITY.AccessControlConditionDecryption,
    },
  ];

  const sessionSigs = await client.getSessionSigs({
    chain: LIT_CHAIN,
    resourceAbilityRequests,
    authNeededCallback: async ({
      uri,
      expiration,
      resourceAbilityRequests: reqs,
    }: {
      uri?: string;
      expiration?: string;
      resourceAbilityRequests?: any[];
    }) => {
      const toSign = await createSiweMessageWithRecaps({
        uri: uri!,
        expiration: expiration!,
        resources: reqs || [],
        walletAddress: address,
        nonce: latestBlockhash,
        litNodeClient: client,
      });

      return await generateAuthSig({
        signer: ethersSigner,
        toSign,
      });
    },
  });

  return sessionSigs;
}

/**
 * Initialize the Lit Protocol client and connect to the DatilDev network.
 * Call this once at startup.
 */
export async function initLit(): Promise<void> {
  if (litNodeClient) {
    return; // Already initialized
  }

  console.log("[Lit] Connecting to Lit DatilDev network...");
  litNodeClient = new LitNodeClientNodeJs({
    litNetwork: "datil",
    debug: false,
  });

  await litNodeClient.connect();
  console.log("[Lit] Connected successfully.");
}

/**
 * Get the initialized Lit client, throwing if not yet connected.
 */
function getClient(): LitNodeClientNodeJs {
  if (!litNodeClient) {
    throw new Error(
      "[Lit] Client not initialized. Call initLit() first."
    );
  }
  return litNodeClient;
}

/**
 * Encrypt a vote rationale using Lit Protocol.
 * The ciphertext can only be decrypted after proposalEndTime has passed,
 * enforced by the TimeLock contract's isAfterTimestamp() condition.
 *
 * @param rationale - The plaintext reasoning to encrypt
 * @param proposalEndTime - Unix timestamp (seconds) after which decryption is allowed
 * @returns The encrypted ciphertext and data hash needed for later decryption
 */
export async function encryptRationale(
  rationale: string,
  proposalEndTime: bigint
): Promise<{ ciphertext: string; dataToEncryptHash: string }> {
  const client = getClient();

  const evmContractConditions = buildTimeLockConditions(proposalEndTime);

  // Convert string to Uint8Array for encryption
  const dataToEncrypt = new TextEncoder().encode(rationale);

  const { ciphertext, dataToEncryptHash } = await client.encrypt({
    evmContractConditions,
    dataToEncrypt,
  });

  console.log(
    `[Lit] Encrypted rationale (${rationale.length} chars). ` +
    `Decryptable after timestamp ${proposalEndTime.toString()}.`
  );

  return { ciphertext, dataToEncryptHash };
}

/**
 * Decrypt a previously encrypted vote rationale.
 * This will only succeed if the current block.timestamp >= proposalEndTime,
 * as enforced by the TimeLock contract condition.
 *
 * @param ciphertext - The encrypted ciphertext from encryptRationale()
 * @param dataToEncryptHash - The hash from encryptRationale()
 * @param proposalEndTime - The same timestamp used during encryption
 * @returns The decrypted plaintext rationale
 */
export async function decryptRationale(
  ciphertext: string,
  dataToEncryptHash: string,
  proposalEndTime: bigint
): Promise<string> {
  const client = getClient();

  const evmContractConditions = buildTimeLockConditions(proposalEndTime);

  // Get session signatures to authorize decryption
  const sessionSigs = await getSessionSigs(client, evmContractConditions);

  const { decryptedData } = await client.decrypt({
    chain: LIT_CHAIN,
    ciphertext,
    dataToEncryptHash,
    evmContractConditions,
    sessionSigs,
  });

  const decryptedString = new TextDecoder().decode(decryptedData);

  console.log(
    `[Lit] Decrypted rationale (${decryptedString.length} chars).`
  );

  return decryptedString;
}

/**
 * Disconnect from the Lit network. Call on shutdown.
 */
export async function disconnectLit(): Promise<void> {
  if (litNodeClient) {
    await litNodeClient.disconnect();
    litNodeClient = null;
    console.log("[Lit] Disconnected.");
  }
}
