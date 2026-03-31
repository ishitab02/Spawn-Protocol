import Link from "next/link";
import { listJudgeReceipts } from "@/lib/judge-receipt";
import { storageViewerPath } from "@/lib/contracts";

export const dynamic = "force-dynamic";

function formatTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusClass(status: string) {
  if (status === "completed") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (status === "failed") return "border-red-400/30 bg-red-400/10 text-red-300";
  if (status === "running" || status === "queued") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }
  return "border-gray-700 bg-gray-900 text-gray-400";
}

export default function ReceiptIndexPage() {
  const receipts = listJudgeReceipts(24);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded border border-indigo-400/20 bg-indigo-400/5 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-indigo-300">
            Judge Receipt Index
          </div>
          <h1 className="text-2xl font-mono font-bold text-gray-100 tracking-tight">
            Receipts
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Discoverable proof bundles for recent canonical runs. Open any run to inspect ERC-8004 receipts, Filecoin memory, and lineage in one place.
          </p>
        </div>
        <Link
          href="/judge-flow"
          className="w-fit rounded-lg border border-gray-700 px-4 py-2 text-sm font-mono text-gray-300 transition hover:border-gray-500"
        >
          Open Judge Flow
        </Link>
      </div>

      {receipts.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-6 text-sm text-gray-500">
          No judge receipts found yet. Run a canonical flow from <span className="font-mono text-gray-300">/judge-flow</span>.
        </div>
      ) : (
        <div className="space-y-4">
          {receipts.map((receipt) => (
            <Link
              key={receipt.runId}
              href={`/receipt/${encodeURIComponent(receipt.runId)}`}
              className="block rounded-xl border border-gray-800 bg-[#0d0d14] p-4 transition hover:border-gray-600"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-gray-100">{receipt.runId}</span>
                    <span className={`rounded border px-2 py-1 text-[10px] font-mono uppercase tracking-wider ${statusClass(receipt.status)}`}>
                      {receipt.status}
                    </span>
                    <span className="rounded border border-blue-400/20 bg-blue-400/5 px-2 py-1 text-[10px] font-mono text-blue-300">
                      {receipt.governor}
                    </span>
                    {receipt.filecoinCid && (
                      <span className="rounded border border-green-400/20 bg-green-400/5 px-2 py-1 text-[10px] font-mono text-green-300">
                        Filecoin
                      </span>
                    )}
                    {receipt.validationRequestId && (
                      <span className="rounded border border-indigo-400/20 bg-indigo-400/5 px-2 py-1 text-[10px] font-mono text-indigo-300">
                        validation #{receipt.validationRequestId}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2 text-sm text-gray-300 md:grid-cols-2 xl:grid-cols-4">
                    <div className="font-mono">Proposal: {receipt.proposalId || "—"}</div>
                    <div className="font-mono">Decision: {receipt.decision || "—"}</div>
                    <div className="font-mono">Proof ERC-8004: {receipt.proofChildAgentId || "—"}</div>
                    <div className="font-mono">Respawn ERC-8004: {receipt.respawnedChildAgentId || "—"}</div>
                    <div className="font-mono">Started: {formatTime(receipt.startedAt)}</div>
                    <div className="font-mono">Completed: {formatTime(receipt.completedAt)}</div>
                    <div className="font-mono">
                      Duration: {receipt.durationMs ? `${(receipt.durationMs / 1000).toFixed(1)}s` : "—"}
                    </div>
                    <div className="font-mono">Events: {receipt.events.length}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <span className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs font-mono text-gray-300">
                    Open Receipt ↗
                  </span>
                  {receipt.filecoinCid && (
                    <span className="rounded border border-green-400/20 bg-green-400/5 px-2 py-1 text-xs font-mono text-green-300">
                      {receipt.filecoinCid.slice(0, 16)}…
                    </span>
                  )}
                </div>
              </div>

              {receipt.filecoinCid && (
                <div className="mt-3 text-xs font-mono text-gray-500">
                  Storage: {storageViewerPath(receipt.filecoinCid)}
                </div>
              )}
              {receipt.failureReason && (
                <div className="mt-3 rounded border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
                  {receipt.failureReason}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
