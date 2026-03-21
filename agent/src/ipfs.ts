/**
 * IPFS Integration — Pin agent execution logs to IPFS via Filebase
 *
 * Provides verifiable, immutable storage for agent_log.json so that
 * governance actions have a permanent audit trail beyond the local file.
 *
 * Uses Filebase's S3-compatible API (no SDK beyond @aws-sdk/client-s3).
 * Gracefully degrades if FILEBASE_KEY/SECRET/BUCKET are not set.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { setChildTextRecord } from "./ens.js";

const FILEBASE_ENDPOINT = "https://s3.filebase.com";
const LOG_PATH = join(process.cwd(), "..", "agent_log.json");

function getCredentials(): { key: string; secret: string; bucket: string } | null {
  const key = process.env.FILEBASE_KEY;
  const secret = process.env.FILEBASE_SECRET;
  const bucket = process.env.FILEBASE_BUCKET;
  if (!key || !secret || !bucket) {
    console.warn("[IPFS] FILEBASE_KEY/FILEBASE_SECRET/FILEBASE_BUCKET not set — skipping IPFS pin");
    return null;
  }
  return { key, secret, bucket };
}

/**
 * Pin arbitrary JSON data to IPFS via Filebase S3-compatible API.
 * Returns the CID (content identifier) on success.
 * Filebase returns the IPFS CID in the x-amz-meta-cid response header.
 */
export async function pinToIPFS(data: any): Promise<string> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error("Filebase credentials not configured");
  }

  const client = new S3Client({
    endpoint: FILEBASE_ENDPOINT,
    region: "us-east-1",
    credentials: {
      accessKeyId: creds.key,
      secretAccessKey: creds.secret,
    },
    forcePathStyle: true,
  });

  const objectKey = `spawn-protocol-${Date.now()}.json`;
  let cid: string | undefined;

  // Middleware to capture IPFS CID from Filebase response header
  client.middlewareStack.add(
    (next: any) => async (args: any) => {
      const result = await next(args);
      cid = (result.response as any)?.headers?.["x-amz-meta-cid"];
      return result;
    },
    { step: "deserialize", priority: "high" }
  );

  await client.send(
    new PutObjectCommand({
      Bucket: creds.bucket,
      Key: objectKey,
      Body: JSON.stringify(data),
      ContentType: "application/json",
    })
  );

  if (!cid) {
    throw new Error("Filebase did not return CID in response headers");
  }
  return cid;
}

/**
 * Read agent_log.json from disk and pin it to IPFS.
 * Returns the CID on success.
 */
export async function pinAgentLog(): Promise<string> {
  const raw = readFileSync(LOG_PATH, "utf-8");
  const logData = JSON.parse(raw);
  const cid = await pinToIPFS(logData);
  return cid;
}

/**
 * Store a CID as an ENS text record on SpawnENSRegistry.
 * Uses label "parent" and key "ipfs.agent_log".
 */
export async function storeLogCIDOnchain(cid: string): Promise<void> {
  await setChildTextRecord("parent", "ipfs.agent_log", cid);
}

/**
 * Pin a termination memory record to IPFS for lineage persistence.
 * Returns the CID on success, null on failure.
 */
export async function pinTerminationMemory(report: {
  lineageKey: string;
  generation: number;
  reason: string;
  score: number;
  childLabel: string;
  // Structured Venice analysis
  summary?: string;
  lessons?: string[];
  avoidPatterns?: string[];
  recommendedFocus?: string;
  // Actual voting record that triggered termination
  votingHistory?: Array<{ proposalId: string; support: number; description?: string }>;
  ownerValues?: string;
}): Promise<string | null> {
  try {
    return await pinToIPFS({
      ...report,
      type: 'termination_memory',
      project: 'spawn-protocol',
      pinnedAt: new Date().toISOString(),
    });
  } catch { return null; }
}
