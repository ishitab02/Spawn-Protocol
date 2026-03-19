/**
 * Swarm Orchestrator — the REAL autonomous system.
 *
 * This is what Spawn Protocol actually is: a persistent, self-running swarm.
 * The parent agent continuously:
 *   1. Discovers governance targets (multiple DAOs)
 *   2. Spawns one child per DAO as a separate process
 *   3. Children vote autonomously via Venice AI
 *   4. Parent evaluates alignment and kills/respawns drifting children
 *   5. System runs indefinitely with zero human intervention
 *
 * Usage: PRIVATE_KEY=... VENICE_API_KEY=... npm run swarm
 */

import { fork, type ChildProcess } from "child_process";
import { publicClient, walletClient, account, sendTxAndWait } from "./chain.js";
import {
  MockGovernorABI,
  ParentTreasuryABI,
  SpawnFactoryABI,
  ChildGovernorABI,
} from "./abis.js";
import { evaluateAlignment } from "./venice.js";
import { registerSubdomain } from "./ens.js";
import { registerAgent, updateAgentMetadata } from "./identity.js";
import { createVotingDelegation } from "./delegation.js";
import { logYieldStatus, initSimulatedTreasury } from "./lido.js";
import type { DeployedAddresses } from "./types.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ALIGNMENT_THRESHOLD = 40;
const STRIKES_TO_KILL = 2;
const PARENT_CYCLE_MS = 60_000;
const PROPOSAL_CYCLE_MS = 120_000; // create new proposals every 2 min

// Track child processes (genuinely independent)
const childProcesses = new Map<string, ChildProcess>();
const strikes = new Map<string, number>();

interface DAOConfig {
  name: string;
  governorAddr: `0x${string}`;
  proposals: string[];
}

export async function runSwarm(
  addresses: DeployedAddresses,
  daoConfigs: DAOConfig[]
) {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   SPAWN PROTOCOL — AUTONOMOUS GOVERNANCE SWARM  ║");
  console.log("║   Self-spawning · Self-correcting · Self-funding ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log(`Agent wallet: ${account.address}`);
  console.log(`DAOs to govern: ${daoConfigs.map((d) => d.name).join(", ")}`);
  console.log(`Parent cycle: ${PARENT_CYCLE_MS / 1000}s`);
  console.log(`Proposal cycle: ${PROPOSAL_CYCLE_MS / 1000}s\n`);

  // Step 0: Register parent
  console.log("── Registering parent agent ──");
  try {
    await sendTxAndWait({
      address: addresses.parentTreasury,
      abi: ParentTreasuryABI,
      functionName: "setParentAgent",
      args: [account.address],
    });
  } catch {}
  console.log("Parent registered:", account.address);

  // Init simulated treasury
  initSimulatedTreasury(BigInt(1e18), Math.floor(Date.now() / 1000) - 86400);

  // Read governance values
  const values = (await publicClient.readContract({
    address: addresses.parentTreasury,
    abi: ParentTreasuryABI,
    functionName: "getGovernanceValues",
  })) as string;
  console.log("Governance values:", values.slice(0, 80) + "...\n");

  // Fund factory
  console.log("── Funding factory ──");
  try {
    await sendTxAndWait({
      address: addresses.parentTreasury,
      abi: ParentTreasuryABI,
      functionName: "deposit",
      args: [],
      value: BigInt(1e16), // 0.01 ETH
    });
    await sendTxAndWait({
      address: addresses.parentTreasury,
      abi: ParentTreasuryABI,
      functionName: "fundFactory",
      args: [BigInt(1e16)],
    });
    console.log("Factory funded");
  } catch (err) {
    console.log("Factory funding skipped (may already be funded)");
  }

  // Step 1: Spawn one child per DAO
  console.log("\n── Spawning child agents (one per DAO) ──");
  for (const dao of daoConfigs) {
    try {
      const receipt = await sendTxAndWait({
        address: addresses.spawnFactory,
        abi: SpawnFactoryABI,
        functionName: "spawnChild",
        args: [dao.name, dao.governorAddr, 0n, 200000n],
      });
      console.log(`  Spawned ${dao.name} (tx: ${receipt.transactionHash})`);
    } catch (err: any) {
      console.log(`  ${dao.name}: ${err?.message?.slice(0, 60) || "spawn failed"}`);
    }
  }

  // Get all children
  const children = (await publicClient.readContract({
    address: addresses.spawnFactory,
    abi: SpawnFactoryABI,
    functionName: "getActiveChildren",
  })) as any[];

  console.log(`\nActive children: ${children.length}`);
  for (const child of children) {
    console.log(`  ${child.id}: ${child.ensLabel} @ ${child.childAddr}`);

    // Register on ERC-8004
    try {
      await registerAgent(`spawn://${child.ensLabel}.spawn.eth`, {
        agentType: "child",
        assignedDAO: child.ensLabel,
        governanceContract: child.governance,
        ensName: `${child.ensLabel}.spawn.eth`,
        alignmentScore: 100,
        capabilities: ["vote", "reason", "encrypt-rationale"],
        createdAt: Date.now(),
      });
    } catch {}

    // ENS subdomain
    try {
      await registerSubdomain(child.ensLabel, child.childAddr);
    } catch {}

    // MetaMask delegation
    try {
      await createVotingDelegation(child.governance, child.childAddr, 100);
    } catch {}
  }

  // Step 2: Spawn each child as a SEPARATE PROCESS
  console.log("\n── Launching child processes (independent reasoning loops) ──");
  for (const child of children) {
    spawnChildProcess(
      child.childAddr,
      child.governance,
      child.ensLabel,
      addresses.parentTreasury,
      values
    );
  }

  // Step 3: Start proposal creation loop (simulates real DAO activity)
  console.log("\n── Starting proposal generation loop ──");
  proposalLoop(daoConfigs);

  // Step 4: Start parent evaluation loop
  console.log("── Starting parent evaluation loop ──\n");
  parentLoop(addresses, values, daoConfigs);
}

function spawnChildProcess(
  childAddr: string,
  governanceAddr: string,
  label: string,
  treasuryAddr: string,
  _values: string
) {
  const childScript = join(__dirname, "spawn-child.ts");
  const child = fork(childScript, [childAddr, governanceAddr, label, treasuryAddr], {
    execArgv: ["--import", "tsx"],
    env: { ...process.env },
    stdio: ["pipe", "pipe", "pipe", "ipc"],
  });

  child.stdout?.on("data", (data) => {
    process.stdout.write(`[${label}] ${data}`);
  });
  child.stderr?.on("data", (data) => {
    process.stderr.write(`[${label}:err] ${data}`);
  });

  child.on("exit", (code) => {
    console.log(`[Swarm] Child ${label} exited with code ${code}`);
    childProcesses.delete(label);
  });

  childProcesses.set(label, child);
  console.log(`  ${label}: PID ${child.pid} (independent process)`);
}

async function proposalLoop(daoConfigs: DAOConfig[]) {
  let proposalIndex = 0;
  const allProposals = daoConfigs.flatMap((dao) =>
    dao.proposals.map((p) => ({ dao, proposal: p }))
  );

  setInterval(async () => {
    if (proposalIndex >= allProposals.length) return;

    const { dao, proposal } = allProposals[proposalIndex];
    try {
      await sendTxAndWait({
        address: dao.governorAddr,
        abi: MockGovernorABI,
        functionName: "createProposal",
        args: [proposal],
      });
      console.log(`[Proposals] Created on ${dao.name}: "${proposal.slice(0, 50)}..."`);
    } catch (err) {
      console.log(`[Proposals] Failed on ${dao.name}: ${(err as Error).message?.slice(0, 40)}`);
    }
    proposalIndex++;
  }, PROPOSAL_CYCLE_MS);
}

async function parentLoop(
  addresses: DeployedAddresses,
  values: string,
  daoConfigs: DAOConfig[]
) {
  let cycle = 0;

  const loop = async () => {
    cycle++;
    console.log(`\n══ Parent Cycle ${cycle} ══`);

    try {
      const children = (await publicClient.readContract({
        address: addresses.spawnFactory,
        abi: SpawnFactoryABI,
        functionName: "getActiveChildren",
      })) as any[];

      console.log(`Active children: ${children.length}`);

      // Evaluate each child
      for (const child of children) {
        try {
          const history = (await publicClient.readContract({
            address: child.childAddr,
            abi: ChildGovernorABI,
            functionName: "getVotingHistory",
          })) as any[];

          if (history.length === 0) {
            console.log(`  ${child.ensLabel}: no votes yet`);
            continue;
          }

          const historyForEval = history.map((v: any) => ({
            proposalId: v.proposalId.toString(),
            support: Number(v.support),
          }));

          const score = await evaluateAlignment(values, historyForEval);
          const clamped = Math.min(Math.max(score, 0), 100);
          const label =
            clamped >= 70 ? "ALIGNED" : clamped >= 40 ? "DRIFTING" : "MISALIGNED";

          console.log(
            `  ${child.ensLabel}: ${clamped}/100 [${label}] (${history.length} votes)`
          );

          // Update alignment onchain
          await sendTxAndWait({
            address: child.childAddr,
            abi: ChildGovernorABI,
            functionName: "updateAlignmentScore",
            args: [BigInt(clamped)],
          });

          // Track strikes
          const key = child.id.toString();
          if (clamped < ALIGNMENT_THRESHOLD) {
            const s = (strikes.get(key) || 0) + 1;
            strikes.set(key, s);
            console.log(`  ⚠ Strike ${s}/${STRIKES_TO_KILL}`);

            if (s >= STRIKES_TO_KILL) {
              console.log(`  ✖ TERMINATING ${child.ensLabel}`);

              // Kill the process
              const proc = childProcesses.get(child.ensLabel);
              if (proc) proc.kill();

              // Recall onchain
              await sendTxAndWait({
                address: addresses.spawnFactory,
                abi: SpawnFactoryABI,
                functionName: "recallChild",
                args: [child.id],
              });

              // Respawn
              const newLabel = `${child.ensLabel}-v2`;
              console.log(`  ↻ Respawning as ${newLabel}`);
              await sendTxAndWait({
                address: addresses.spawnFactory,
                abi: SpawnFactoryABI,
                functionName: "spawnChild",
                args: [newLabel, child.governance, 0n, 200000n],
              });

              // Launch new process
              const updated = (await publicClient.readContract({
                address: addresses.spawnFactory,
                abi: SpawnFactoryABI,
                functionName: "getActiveChildren",
              })) as any[];
              const newChild = updated.find((c: any) => c.ensLabel === newLabel);
              if (newChild) {
                spawnChildProcess(
                  newChild.childAddr,
                  newChild.governance,
                  newLabel,
                  addresses.parentTreasury,
                  values
                );
              }

              strikes.delete(key);
            }
          } else {
            strikes.set(key, 0);
          }
        } catch (err) {
          console.error(`  ${child.ensLabel}: eval error`, (err as Error).message?.slice(0, 40));
        }
      }

      // Yield status
      await logYieldStatus();
    } catch (err) {
      console.error("Parent cycle error:", (err as Error).message?.slice(0, 60));
    }

    setTimeout(loop, PARENT_CYCLE_MS);
  };

  loop();
}

// ── Main entry point ──
const ADDRESSES: DeployedAddresses = {
  mockGovernor: "0x377c623bf42580DAa8F6a9138639aC4861097700",
  parentTreasury: "0xd6222F060FEe779E4F6A7f604b8E37593AE279dF",
  childImplementation: "0x7d3F6A908d28D910421A90BF8E92F5D50d46e23e",
  spawnFactory: "0x15003b671d3b83a0Df2592665283742f8e65ED36",
  timeLock: "0x5962CdAF11C0A1DE9498fF05F0926ba33a0257CA",
};

// Multiple DAOs to govern — each gets its own child agent
const DAO_CONFIGS: DAOConfig[] = [
  {
    name: "uniswap-dao",
    governorAddr: ADDRESSES.mockGovernor, // same contract, different proposals
    proposals: [
      "Allocate 500K USDC to fund public goods grants program",
      "Reduce UNI token emission rate by 30% to combat inflation",
      "Create a Uniswap Foundation security council with 7 multisig members",
    ],
  },
  {
    name: "lido-dao",
    governorAddr: ADDRESSES.mockGovernor,
    proposals: [
      "Increase stETH withdrawal buffer from 1000 to 5000 ETH",
      "Fund Lido ecosystem grants program with 2M LDO tokens",
      "Implement dual governance model for staker protection",
    ],
  },
  {
    name: "ens-dao",
    governorAddr: ADDRESSES.mockGovernor,
    proposals: [
      "Reduce ENS registration fees by 50% for 3-letter domains",
      "Fund ENS integration grants for L2 deployments",
      "Establish ENS endowment fund with 10K ETH from treasury",
    ],
  },
];

// When we deploy 3 separate MockGovernors, update governorAddr for each DAO.
// For now they share one governor but with different proposals.

runSwarm(ADDRESSES, DAO_CONFIGS).catch(console.error);
