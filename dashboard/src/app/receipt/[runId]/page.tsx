"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { StorageInlinePreview } from "@/components/StorageInlinePreview";
import { explorerTx, storageViewerPath } from "@/lib/contracts";

type JudgeEvent = {
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

type JudgeExecutionLog = {
  timestamp: string;
  phase: string;
  action: string;
  details: string;
  txHash?: string;
  txHashes?: string[];
  status: string;
  proofStatus?: string;
};

type JudgeReceipt = {
  runId: string;
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
  decision?: string;
  litEncrypted?: boolean;
  reasoningHash?: string;
  veniceTokensUsed?: number;
  veniceCallsUsed?: number;
  events: JudgeEvent[];
  executionLogs: JudgeExecutionLog[];
};

const EMPTY_RECEIPT: JudgeReceipt = {
  runId: "",
  status: "idle",
  governor: "uniswap",
  forcedScore: 15,
  events: [],
  executionLogs: [],
};

function formatTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function shortHash(hash?: string) {
  if (!hash) return "—";
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function statusClass(status: JudgeReceipt["status"]) {
  if (status === "completed") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (status === "failed") return "border-red-400/30 bg-red-400/10 text-red-300";
  if (status === "running" || status === "queued") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }
  return "border-gray-700 bg-gray-900 text-gray-400";
}

export default function JudgeReceiptPage({
}: {}) {
  const params = useParams<{ runId: string }>();
  const runId = Array.isArray(params?.runId) ? params.runId[0] : params?.runId || "";
  const [receipt, setReceipt] = useState<JudgeReceipt>(EMPTY_RECEIPT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!runId) return;

        const res = await fetch(`/api/receipt/${encodeURIComponent(runId)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (!cancelled) {
          setReceipt(data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load receipt");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const receiptLinks = useMemo(
    () =>
      [
        { label: "Proposal", hash: receipt.proposalTxHash },
        { label: "Vote", hash: receipt.voteTxHash },
        { label: "Alignment", hash: receipt.alignmentTxHash },
        { label: "Reputation", hash: receipt.reputationTxHash },
        { label: "Validation Request", hash: receipt.validationTxHash },
        { label: "Validation Response", hash: receipt.validationResponseTxHash },
        { label: "Terminate", hash: receipt.terminationTxHash },
        { label: "Respawn", hash: receipt.respawnTxHash },
      ].filter((item): item is { label: string; hash: string } => Boolean(item.hash)),
    [
      receipt.alignmentTxHash,
      receipt.proposalTxHash,
      receipt.reputationTxHash,
      receipt.respawnTxHash,
      receipt.terminationTxHash,
      receipt.validationResponseTxHash,
      receipt.validationTxHash,
      receipt.voteTxHash,
    ]
  );

  const previewCids = useMemo(() => {
    const seen = new Set<string>();
    return [
      receipt.filecoinCid
        ? {
            cid: receipt.filecoinCid,
            title: "Termination Report",
            subtitle: "Filecoin-backed termination memory generated during this run.",
          }
        : null,
      receipt.lineageSourceCid && receipt.lineageSourceCid !== receipt.filecoinCid
        ? {
            cid: receipt.lineageSourceCid,
            title: "Lineage Memory",
            subtitle: "Memory loaded by the replacement child after respawn.",
          }
        : null,
    ].filter((item): item is { cid: string; title: string; subtitle: string } => {
      if (!item || seen.has(item.cid)) return false;
      seen.add(item.cid);
      return true;
    });
  }, [receipt.filecoinCid, receipt.lineageSourceCid]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded border border-indigo-400/20 bg-indigo-400/5 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-indigo-300">
            ERC-8004 Proof Bundle
          </div>
          <h1 className="text-2xl font-mono font-bold text-gray-100 tracking-tight">
            Canonical Receipt
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            One URL bundling the full judge run: identity, vote, alignment, trust receipts, Filecoin memory, and lineage.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/judge-flow"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-mono text-gray-300 transition hover:border-gray-500"
          >
            Back To Judge Flow
          </Link>
          {runId && (
            <Link
              href={`/logs?search=${encodeURIComponent(runId)}`}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-mono text-gray-300 transition hover:border-gray-500"
            >
              Open Raw Logs
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          { label: "Status", value: receipt.status },
          { label: "Run ID", value: receipt.runId || runId || "—" },
          { label: "Governor", value: receipt.governor || "—" },
          {
            label: "Duration",
            value: receipt.durationMs ? `${(receipt.durationMs / 1000).toFixed(1)}s` : "—",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-800 bg-[#0d0d14] p-4">
            <div className="text-xs uppercase tracking-wider text-gray-600">{item.label}</div>
            <div
              className={`mt-2 inline-flex rounded border px-2 py-1 font-mono text-xs ${
                item.label === "Status" ? statusClass(receipt.status) : "border-gray-700 bg-gray-900 text-gray-200"
              }`}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4">
          <div className="mb-3 text-xs uppercase tracking-wider text-gray-600">Identity + Scope</div>
          <div className="grid gap-2 text-sm text-gray-300 md:grid-cols-2">
            <div className="font-mono">Proof child: {receipt.proofChildLabel || "—"}</div>
            <div className="font-mono">
              Proof ERC-8004:{" "}
              {receipt.proofChildAgentId ? (
                <Link href={`/agent/${receipt.proofChildAgentId}`} className="text-blue-300 hover:underline">
                  {receipt.proofChildAgentId}
                </Link>
              ) : (
                "—"
              )}
            </div>
            <div className="font-mono">Proposal ID: {receipt.proposalId || "—"}</div>
            <div className="font-mono">Forced score: {receipt.forcedScore}/100</div>
            <div className="font-mono">Respawned child: {receipt.respawnedChildLabel || "—"}</div>
            <div className="font-mono">
              Respawn ERC-8004:{" "}
              {receipt.respawnedChildAgentId ? (
                <Link href={`/agent/${receipt.respawnedChildAgentId}`} className="text-blue-300 hover:underline">
                  {receipt.respawnedChildAgentId}
                </Link>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4">
          <div className="mb-3 text-xs uppercase tracking-wider text-gray-600">Vote + Venice Reasoning</div>
          <div className="grid gap-2 text-sm text-gray-300 md:grid-cols-2">
            <div className="font-mono">Decision: {receipt.decision || "—"}</div>
            <div className="font-mono">Lit encrypted: {receipt.litEncrypted === undefined ? "—" : receipt.litEncrypted ? "yes" : "no"}</div>
            <div className="font-mono">Venice calls: {receipt.veniceCallsUsed ?? "—"}</div>
            <div className="font-mono">Venice tokens: {receipt.veniceTokensUsed ?? "—"}</div>
            <div className="font-mono md:col-span-2 break-all">
              Reasoning hash: {receipt.reasoningHash || "—"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4">
          <div className="mb-3 text-xs uppercase tracking-wider text-gray-600">Trust Receipts</div>
          <div className="grid gap-2 text-sm text-gray-300">
            <div className="font-mono">Validation request: {receipt.validationRequestId || "—"}</div>
            <div className="font-mono">Reputation tx: {receipt.reputationTxHash ? shortHash(receipt.reputationTxHash) : "—"}</div>
            <div className="font-mono">Validation request tx: {receipt.validationTxHash ? shortHash(receipt.validationTxHash) : "—"}</div>
            <div className="font-mono">Validation response tx: {receipt.validationResponseTxHash ? shortHash(receipt.validationResponseTxHash) : "—"}</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4">
          <div className="mb-3 text-xs uppercase tracking-wider text-gray-600">Filecoin + Lineage</div>
          <div className="grid gap-2 text-sm text-gray-300">
            <div className="font-mono break-all">Termination CID: {receipt.filecoinCid || "—"}</div>
            <div className="font-mono break-all">Lineage CID: {receipt.lineageSourceCid || "—"}</div>
            {receipt.filecoinCid && (
              <Link
                href={storageViewerPath(receipt.filecoinCid)}
                className="w-fit rounded border border-green-400/20 bg-green-400/5 px-2 py-1 text-xs font-mono text-green-300"
              >
                Open Storage Viewer ↗
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-800 bg-[#0d0d14] p-4">
        <div className="mb-4 text-xs uppercase tracking-wider text-gray-600">Receipt Bundle</div>
        <div className="flex flex-wrap gap-2">
          {receiptLinks.map((item) => (
            <a
              key={`${item.label}-${item.hash}`}
              href={explorerTx(item.hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-blue-400/20 bg-blue-400/5 px-2 py-1 text-xs font-mono text-blue-300"
            >
              {item.label}: {shortHash(item.hash)} ↗
            </a>
          ))}
          {receipt.filecoinCid && (
            <Link
              href={storageViewerPath(receipt.filecoinCid)}
              className="rounded border border-green-400/20 bg-green-400/5 px-2 py-1 text-xs font-mono text-green-300"
            >
              Filecoin: {receipt.filecoinCid.slice(0, 16)}… ↗
            </Link>
          )}
        </div>
        {receipt.failureReason && (
          <div className="mt-4 rounded border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
            {receipt.failureReason}
          </div>
        )}
      </div>

      {previewCids.length > 0 && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {previewCids.map((preview) => (
            <StorageInlinePreview
              key={preview.cid}
              cid={preview.cid}
              title={preview.title}
              subtitle={preview.subtitle}
            />
          ))}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-gray-800 bg-[#0d0d14] p-4">
        <div className="mb-4 text-xs uppercase tracking-wider text-gray-600">Lifecycle Timeline</div>
        <div className="space-y-3">
          {receipt.events.map((event) => (
            <div
              key={`${event.action}-${event.at}`}
              className={`rounded-lg border p-3 ${
                event.status === "success"
                  ? "border-green-500/30 bg-green-500/5"
                  : event.status === "failed"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-gray-800 bg-[#101018]"
              }`}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-mono text-sm text-gray-100">{event.action}</div>
                  <div className="text-xs text-gray-500">{formatTime(event.at)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded border px-2 py-1 text-[10px] font-mono uppercase tracking-wider ${
                      event.status === "success"
                        ? "border-green-400/30 bg-green-400/10 text-green-300"
                        : event.status === "failed"
                        ? "border-red-400/30 bg-red-400/10 text-red-300"
                        : "border-gray-700 bg-gray-900 text-gray-400"
                    }`}
                  >
                    {event.status}
                  </span>
                  {event.txHash && (
                    <a
                      href={explorerTx(event.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-blue-400/20 bg-blue-400/5 px-2 py-1 text-[10px] font-mono text-blue-300"
                    >
                      {shortHash(event.txHash)} ↗
                    </a>
                  )}
                  {event.filecoinCid && (
                    <Link
                      href={storageViewerPath(event.filecoinCid)}
                      className="rounded border border-green-400/20 bg-green-400/5 px-2 py-1 text-[10px] font-mono text-green-300"
                    >
                      FIL ↗
                    </Link>
                  )}
                </div>
              </div>
              {event.details && <div className="mt-2 text-xs text-gray-400">{event.details}</div>}
            </div>
          ))}
          {!loading && receipt.events.length === 0 && (
            <div className="text-sm text-gray-500">No receipt events found for this run.</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4">
        <div className="mb-4 text-xs uppercase tracking-wider text-gray-600">Raw Judge Execution Logs</div>
        <div className="space-y-3">
          {receipt.executionLogs.map((entry) => (
            <div key={`${entry.timestamp}-${entry.action}`} className="rounded-lg border border-gray-800 bg-[#101018] p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-mono text-sm text-gray-100">{entry.action}</div>
                  <div className="text-xs text-gray-500">{formatTime(entry.timestamp)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.proofStatus && (
                    <span className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] font-mono text-gray-300">
                      {entry.proofStatus}
                    </span>
                  )}
                  {entry.txHash && (
                    <a
                      href={explorerTx(entry.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-blue-400/20 bg-blue-400/5 px-2 py-1 text-[10px] font-mono text-blue-300"
                    >
                      {shortHash(entry.txHash)} ↗
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">{entry.details}</div>
            </div>
          ))}
          {!loading && receipt.executionLogs.length === 0 && (
            <div className="text-sm text-gray-500">No judge-tagged execution logs found for this run.</div>
          )}
        </div>
      </div>

      {!loading && receipt.startedAt && (
        <div className="mt-4 text-xs font-mono text-gray-600">
          Started: {formatTime(receipt.startedAt)} · Completed: {formatTime(receipt.completedAt)}
        </div>
      )}
    </div>
  );
}
