import { publicClient, walletClient, account } from "./chain.js";
import { SpawnFactoryABI, ParentTreasuryABI, ChildGovernorABI, MockGovernorABI } from "./abis.js";
import { evaluateAlignment } from "./venice.js";
import { toHex } from "viem";
import type { DeployedAddresses, ChildInfo } from "./types.js";

const ALIGNMENT_THRESHOLD = 40;
const MISALIGNMENT_STRIKES_TO_KILL = 2;
const CYCLE_INTERVAL_MS = 60_000;

// Track misalignment strikes per child
const strikes = new Map<string, number>();

export async function runParentLoop(addresses: DeployedAddresses) {
  console.log("[Parent] Starting parent agent loop...");
  console.log("[Parent] Agent address:", account.address);

  while (true) {
    try {
      await parentCycle(addresses);
    } catch (err) {
      console.error("[Parent] Cycle error:", err);
    }
    await sleep(CYCLE_INTERVAL_MS);
  }
}

async function parentCycle(addresses: DeployedAddresses) {
  // 1. Read owner's governance values
  const values = (await publicClient.readContract({
    address: addresses.parentTreasury,
    abi: ParentTreasuryABI,
    functionName: "getGovernanceValues",
  })) as string;

  console.log("[Parent] Governance values:", values.slice(0, 80) + "...");

  // 2. Get active children
  const children = (await publicClient.readContract({
    address: addresses.spawnFactory,
    abi: SpawnFactoryABI,
    functionName: "getActiveChildren",
  })) as ChildInfo[];

  console.log(`[Parent] Active children: ${children.length}`);

  // 3. Evaluate each child's alignment
  for (const child of children) {
    try {
      await evaluateChild(child, values, addresses);
    } catch (err) {
      console.error(`[Parent] Error evaluating child ${child.id}:`, err);
    }
  }

  // 4. Check for unassigned proposals — spawn children if needed
  await checkForNewProposals(addresses, children);
}

async function evaluateChild(
  child: ChildInfo,
  values: string,
  addresses: DeployedAddresses
) {
  const voteHistory = (await publicClient.readContract({
    address: child.childAddr,
    abi: ChildGovernorABI,
    functionName: "getVotingHistory",
  })) as any[];

  if (voteHistory.length === 0) {
    console.log(`[Parent] Child ${child.id} (${child.ensLabel}): no votes yet`);
    return;
  }

  const historyForEval = voteHistory.map((v: any) => ({
    proposalId: v.proposalId.toString(),
    support: Number(v.support),
  }));

  const score = await evaluateAlignment(values, historyForEval);
  console.log(
    `[Parent] Child ${child.id} (${child.ensLabel}): alignment=${score}`
  );

  // Update alignment score onchain
  const hash = await walletClient.writeContract({
    address: child.childAddr,
    abi: ChildGovernorABI,
    functionName: "updateAlignmentScore",
    args: [BigInt(score)],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  // Track strikes
  const key = child.id.toString();
  if (score < ALIGNMENT_THRESHOLD) {
    const currentStrikes = (strikes.get(key) || 0) + 1;
    strikes.set(key, currentStrikes);
    console.log(
      `[Parent] Child ${child.id}: MISALIGNED (strike ${currentStrikes}/${MISALIGNMENT_STRIKES_TO_KILL})`
    );

    if (currentStrikes >= MISALIGNMENT_STRIKES_TO_KILL) {
      console.log(`[Parent] TERMINATING child ${child.id} (${child.ensLabel})`);
      const recallHash = await walletClient.writeContract({
        address: addresses.spawnFactory,
        abi: SpawnFactoryABI,
        functionName: "recallChild",
        args: [child.id],
      });
      await publicClient.waitForTransactionReceipt({ hash: recallHash });
      strikes.delete(key);

      // Respawn a replacement
      console.log(`[Parent] Spawning replacement for ${child.ensLabel}`);
      const spawnHash = await walletClient.writeContract({
        address: addresses.spawnFactory,
        abi: SpawnFactoryABI,
        functionName: "spawnChild",
        args: [
          `${child.ensLabel}-v2`,
          child.governance,
          child.budget,
          child.maxGasPerVote,
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash: spawnHash });
    }
  } else {
    strikes.set(key, 0);
  }
}

async function checkForNewProposals(
  addresses: DeployedAddresses,
  currentChildren: ChildInfo[]
) {
  const proposalCount = (await publicClient.readContract({
    address: addresses.mockGovernor,
    abi: MockGovernorABI,
    functionName: "proposalCount",
  })) as bigint;

  // If there are proposals but no children, spawn one
  if (proposalCount > 0n && currentChildren.length === 0) {
    console.log("[Parent] No children but proposals exist, spawning child...");
    const hash = await walletClient.writeContract({
      address: addresses.spawnFactory,
      abi: SpawnFactoryABI,
      functionName: "spawnChild",
      args: ["governance-1", addresses.mockGovernor, 0n, 200000n],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { parentCycle };
