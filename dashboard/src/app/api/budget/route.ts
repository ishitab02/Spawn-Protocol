import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const BUDGET_STATE_PATH = join(process.cwd(), "..", "runtime_budget_state.json");

const EMPTY_STATE = {
  policy: "normal",
  reasons: [],
  context: "unavailable",
  parentEthBalanceWei: "0",
  parentEthBalance: "0.0000",
  warningEth: "0.0300",
  pauseEth: "0.0150",
  veniceCalls: 0,
  veniceTokens: 0,
  warningTokens: 200000,
  pauseTokens: 350000,
  activeChildren: 0,
  filecoinAvailable: false,
  pauseProposalCreation: false,
  pauseScaling: false,
  pauseJudgeFlow: false,
  lastUpdatedAt: null,
};

export async function GET() {
  try {
    if (!existsSync(BUDGET_STATE_PATH)) {
      return NextResponse.json(EMPTY_STATE);
    }
    const raw = JSON.parse(readFileSync(BUDGET_STATE_PATH, "utf-8"));
    return NextResponse.json({ ...EMPTY_STATE, ...raw });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to read budget state" },
      { status: 500 }
    );
  }
}
