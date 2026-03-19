/**
 * Execution logger — writes agent_log.json for Protocol Labs judging.
 *
 * Every agent action gets logged with timestamp, agent ID, action type,
 * inputs, outputs, and onchain tx hash. This is required for:
 * - Protocol Labs "Let the Agent Cook" ($8K)
 * - Protocol Labs "Agents With Receipts" ($8K)
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const LOG_PATH = join(process.cwd(), "..", "agent_log.json");

interface LogEntry {
  timestamp: string;
  agentId: string;
  agentType: "parent" | "child";
  action: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  txHash?: string;
  chain?: string;
  success: boolean;
  error?: string;
}

interface AgentLog {
  name: string;
  version: string;
  startedAt: string;
  entries: LogEntry[];
}

let log: AgentLog | null = null;

function initLog(): AgentLog {
  if (log) return log;

  if (existsSync(LOG_PATH)) {
    try {
      log = JSON.parse(readFileSync(LOG_PATH, "utf-8"));
      return log!;
    } catch {}
  }

  log = {
    name: "Spawn Protocol",
    version: "1.0.0",
    startedAt: new Date().toISOString(),
    entries: [],
  };
  return log;
}

export function logAction(entry: Omit<LogEntry, "timestamp">) {
  const l = initLog();
  l.entries.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });

  try {
    writeFileSync(LOG_PATH, JSON.stringify(l, null, 2));
  } catch (err) {
    // Don't crash the agent if logging fails
    console.warn("[Logger] Failed to write log:", err);
  }
}

export function logParentAction(
  action: string,
  inputs: Record<string, any>,
  outputs: Record<string, any>,
  txHash?: string,
  success = true,
  error?: string
) {
  logAction({
    agentId: "parent",
    agentType: "parent",
    action,
    inputs,
    outputs,
    txHash,
    chain: "base-sepolia",
    success,
    error,
  });
}

export function logChildAction(
  childLabel: string,
  action: string,
  inputs: Record<string, any>,
  outputs: Record<string, any>,
  txHash?: string,
  success = true,
  error?: string
) {
  logAction({
    agentId: `child:${childLabel}`,
    agentType: "child",
    action,
    inputs,
    outputs,
    txHash,
    chain: "base-sepolia",
    success,
    error,
  });
}
