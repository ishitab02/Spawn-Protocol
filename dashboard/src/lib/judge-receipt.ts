import "server-only";

import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type JudgeEvent = {
  action: string;
  at: string;
  status: "pending" | "success" | "failed";
  txHash?: string;
  txHashes?: string[];
  filecoinCid?: string;
  filecoinUrl?: string;
  validationRequestId?: string;
  respawnedChild?: string;
  lineageSourceCid?: string;
  details?: string;
};

type JudgeFlowState = {
  runId: string | null;
  status: "idle" | "queued" | "running" | "failed" | "completed";
  governor: string;
  proofChildLabel?: string;
  proofChildAgentId?: string;
  respawnedChildLabel?: string;
  respawnedChildAgentId?: string;
  proposalId?: string;
  forcedScore: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  failureReason?: string;
  filecoinCid?: string;
  filecoinUrl?: string;
  validationRequestId?: string;
  validationTxHash?: string;
  validationResponseTxHash?: string;
  reputationTxHash?: string;
  alignmentTxHash?: string;
  terminationTxHash?: string;
  proposalTxHash?: string;
  respawnTxHash?: string;
  voteTxHash?: string;
  lineageSourceCid?: string;
  events: JudgeEvent[];
};

export type JudgeExecutionLog = {
  timestamp: string;
  phase: string;
  action: string;
  details: string;
  chain?: string;
  txHash?: string;
  txHashes?: string[];
  ensLabel?: string;
  status: string;
  judgeRunId?: string;
  judgeStep?: string;
  proofChild?: boolean;
  proofStatus?: string;
  filecoinCid?: string;
  filecoinUrl?: string;
  validationRequestId?: string;
  respawnedChild?: string;
  lineageSourceCid?: string;
};

export type JudgeReceipt = {
  runId: string;
  status: JudgeFlowState["status"];
  governor: string;
  proofChildLabel?: string;
  proofChildAgentId?: string;
  respawnedChildLabel?: string;
  respawnedChildAgentId?: string;
  proposalId?: string;
  forcedScore: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  failureReason?: string;
  filecoinCid?: string;
  filecoinUrl?: string;
  validationRequestId?: string;
  validationTxHash?: string;
  validationResponseTxHash?: string;
  reputationTxHash?: string;
  alignmentTxHash?: string;
  terminationTxHash?: string;
  proposalTxHash?: string;
  respawnTxHash?: string;
  voteTxHash?: string;
  lineageSourceCid?: string;
  decision?: string;
  litEncrypted?: boolean;
  reasoningHash?: string;
  veniceTokensUsed?: number;
  veniceCallsUsed?: number;
  events: JudgeEvent[];
  executionLogs: JudgeExecutionLog[];
};

const CONTROL_PATH =
  process.env.JUDGE_FLOW_CONTROL_PATH ||
  join(process.cwd(), "..", "judge_flow_state.json");
const LOG_PATH = join(process.cwd(), "..", "agent_log.json");

function safeReadJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function readJudgeExecutionLogs(): JudgeExecutionLog[] {
  const rawLog = safeReadJson<{ executionLogs?: JudgeExecutionLog[] }>(LOG_PATH);
  return rawLog?.executionLogs ?? [];
}

function extractDetailValue(details: string | undefined, key: string): string | undefined {
  if (!details) return undefined;
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = details.match(new RegExp(`${escapedKey}=([^,)]+)`));
  return match?.[1];
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function normalizeEvent(log: JudgeExecutionLog): JudgeEvent {
  return {
    action: log.action,
    at: log.timestamp,
    status: (log.status === "failed" ? "failed" : "success") as JudgeEvent["status"],
    txHash: log.txHash,
    txHashes: log.txHashes,
    filecoinCid: log.filecoinCid,
    filecoinUrl: log.filecoinUrl,
    validationRequestId: log.validationRequestId,
    respawnedChild: log.respawnedChild,
    lineageSourceCid: log.lineageSourceCid,
    details: log.details,
  };
}

function dedupeEvents(
  stateEvents: JudgeEvent[] | undefined,
  executionLogs: JudgeExecutionLog[]
): JudgeEvent[] {
  const byAction = new Map<string, JudgeEvent>();
  for (const event of stateEvents ?? []) byAction.set(event.action, event);
  for (const log of executionLogs) {
    const current = byAction.get(log.action);
    byAction.set(log.action, {
      ...current,
      ...normalizeEvent(log),
      action: log.action,
      at: current?.at ?? log.timestamp,
    });
  }
  return [...byAction.values()].sort((a, b) => a.at.localeCompare(b.at));
}

export function getJudgeReceipt(runId: string): JudgeReceipt | null {
  const executionLogs = readJudgeExecutionLogs()
    .filter((entry) => entry.judgeRunId === runId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const state = safeReadJson<JudgeFlowState>(CONTROL_PATH);
  const currentState = state?.runId === runId ? state : null;

  if (!currentState && executionLogs.length === 0) return null;

  const eventByAction = new Map(executionLogs.map((entry) => [entry.action, entry]));
  const voteLog = eventByAction.get("judge_vote_cast");
  const alignmentLog = eventByAction.get("judge_alignment_forced");
  const filecoinLog = eventByAction.get("judge_termination_report_filecoin");
  const validationLog = eventByAction.get("judge_validation_written");
  const respawnLog = eventByAction.get("judge_child_respawned");

  const startedAt = currentState?.startedAt ?? executionLogs[0]?.timestamp;
  const completedAt =
    currentState?.completedAt ??
    executionLogs[executionLogs.length - 1]?.timestamp;
  const durationMs =
    currentState?.durationMs ??
    (startedAt && completedAt
      ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
      : undefined);

  return {
    runId,
    status:
      currentState?.status ??
      (executionLogs.some((entry) => entry.status === "failed")
        ? "failed"
        : executionLogs.some((entry) => entry.action === "judge_flow_completed")
        ? "completed"
        : "running"),
    governor:
      currentState?.governor ??
      extractDetailValue(eventByAction.get("judge_child_spawned")?.details, "governor") ??
      "uniswap",
    proofChildLabel:
      currentState?.proofChildLabel ??
      eventByAction.get("judge_child_spawned")?.ensLabel ??
      extractDetailValue(eventByAction.get("judge_child_spawned")?.details, "ensLabel"),
    proofChildAgentId:
      currentState?.proofChildAgentId ??
      extractDetailValue(alignmentLog?.details, "erc8004AgentId"),
    respawnedChildLabel:
      currentState?.respawnedChildLabel ??
      respawnLog?.respawnedChild ??
      extractDetailValue(respawnLog?.details, "respawnedChild"),
    respawnedChildAgentId: currentState?.respawnedChildAgentId,
    proposalId:
      currentState?.proposalId ??
      extractDetailValue(voteLog?.details, "proposalId"),
    forcedScore:
      currentState?.forcedScore ??
      toNumber(extractDetailValue(alignmentLog?.details, "forcedScore")) ??
      15,
    startedAt,
    completedAt,
    durationMs,
    failureReason: currentState?.failureReason,
    filecoinCid: currentState?.filecoinCid ?? filecoinLog?.filecoinCid,
    filecoinUrl: currentState?.filecoinUrl ?? filecoinLog?.filecoinUrl,
    validationRequestId:
      currentState?.validationRequestId ?? validationLog?.validationRequestId,
    validationTxHash:
      currentState?.validationTxHash ?? validationLog?.txHashes?.[0],
    validationResponseTxHash:
      currentState?.validationResponseTxHash ??
      validationLog?.txHash ??
      validationLog?.txHashes?.[1],
    reputationTxHash:
      currentState?.reputationTxHash ??
      eventByAction.get("judge_reputation_written")?.txHash,
    alignmentTxHash:
      currentState?.alignmentTxHash ?? alignmentLog?.txHash,
    terminationTxHash:
      currentState?.terminationTxHash ??
      eventByAction.get("judge_child_terminated")?.txHash,
    proposalTxHash:
      currentState?.proposalTxHash ??
      eventByAction.get("judge_proposal_seeded")?.txHash,
    respawnTxHash:
      currentState?.respawnTxHash ?? respawnLog?.txHash,
    voteTxHash:
      currentState?.voteTxHash ?? voteLog?.txHash,
    lineageSourceCid:
      currentState?.lineageSourceCid ??
      respawnLog?.lineageSourceCid ??
      filecoinLog?.lineageSourceCid,
    decision: extractDetailValue(voteLog?.details, "decision"),
    litEncrypted: toBoolean(extractDetailValue(voteLog?.details, "litEncrypted")),
    reasoningHash: extractDetailValue(voteLog?.details, "reasoningHash"),
    veniceTokensUsed: toNumber(extractDetailValue(voteLog?.details, "veniceTokensUsed")),
    veniceCallsUsed: toNumber(extractDetailValue(voteLog?.details, "veniceCallsUsed")),
    events: dedupeEvents(currentState?.events, executionLogs),
    executionLogs,
  };
}

export function listJudgeReceiptRunIds(limit = 20): string[] {
  const executionLogs = readJudgeExecutionLogs();
  const ordered = [...executionLogs]
    .filter((entry) => entry.judgeRunId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const seen = new Set<string>();
  const runIds: string[] = [];

  for (const entry of ordered) {
    const runId = entry.judgeRunId;
    if (!runId || seen.has(runId)) continue;
    seen.add(runId);
    runIds.push(runId);
    if (runIds.length >= limit) break;
  }

  const state = safeReadJson<JudgeFlowState>(CONTROL_PATH);
  if (state?.runId && !seen.has(state.runId) && runIds.length < limit) {
    runIds.unshift(state.runId);
  }

  return runIds;
}

export function listJudgeReceipts(limit = 20): JudgeReceipt[] {
  return listJudgeReceiptRunIds(limit)
    .map((runId) => getJudgeReceipt(runId))
    .filter((receipt): receipt is JudgeReceipt => Boolean(receipt))
    .sort((a, b) => {
      const aTime = a.startedAt ?? a.completedAt ?? "";
      const bTime = b.startedAt ?? b.completedAt ?? "";
      return bTime.localeCompare(aTime);
    });
}
