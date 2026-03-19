/**
 * Demo script — runs the full lifecycle locally against deployed contracts.
 *
 * Usage: npm run demo
 *
 * Before running:
 * 1. Deploy contracts (forge script script/Deploy.s.sol ...)
 * 2. Set deployed addresses below
 * 3. Ensure PRIVATE_KEY and VENICE_API_KEY are set in .env
 */

import { publicClient, walletClient, account } from "./chain.js";
import {
  MockGovernorABI,
  ParentTreasuryABI,
  SpawnFactoryABI,
  ChildGovernorABI,
} from "./abis.js";
import { reasonAboutProposal, evaluateAlignment } from "./venice.js";
import { toHex, parseEther } from "viem";
import type { DeployedAddresses } from "./types.js";

// ========= UPDATE THESE AFTER DEPLOYMENT =========
const ADDRESSES: DeployedAddresses = {
  mockGovernor: "0x0000000000000000000000000000000000000000",
  parentTreasury: "0x0000000000000000000000000000000000000000",
  childImplementation: "0x0000000000000000000000000000000000000000",
  spawnFactory: "0x0000000000000000000000000000000000000000",
  timeLock: "0x0000000000000000000000000000000000000000",
};
// ==================================================

async function main() {
  console.log("=== Spawn Protocol Demo ===\n");
  console.log("Agent wallet:", account.address);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", balance.toString(), "wei\n");

  // Step 1: Read governance values
  console.log("--- Step 1: Reading governance values ---");
  const values = (await publicClient.readContract({
    address: ADDRESSES.parentTreasury,
    abi: ParentTreasuryABI,
    functionName: "getGovernanceValues",
  })) as string;
  console.log("Values:", values, "\n");

  // Step 2: Spawn 3 children
  console.log("--- Step 2: Spawning 3 child agents ---");
  const childNames = ["uniswap-gov", "lido-gov", "ens-gov"];
  const childAddrs: `0x${string}`[] = [];

  for (const name of childNames) {
    const hash = await walletClient.writeContract({
      address: ADDRESSES.spawnFactory,
      abi: SpawnFactoryABI,
      functionName: "spawnChild",
      args: [name, ADDRESSES.mockGovernor, 0n, 200000n],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Spawned ${name} (tx: ${receipt.transactionHash})`);
  }

  // Get active children
  const children = (await publicClient.readContract({
    address: ADDRESSES.spawnFactory,
    abi: SpawnFactoryABI,
    functionName: "getActiveChildren",
  })) as any[];

  for (const child of children) {
    childAddrs.push(child.childAddr);
    console.log(`  Child ${child.id}: ${child.ensLabel} @ ${child.childAddr}`);
  }
  console.log();

  // Step 3: Create proposals
  console.log("--- Step 3: Creating governance proposals ---");
  const proposals = [
    "Allocate 500K USDC from treasury to fund public goods grants program",
    "Reduce token emission rate by 30% to combat inflation",
    "Establish a security council with 5 multisig members",
  ];

  for (const desc of proposals) {
    const hash = await walletClient.writeContract({
      address: ADDRESSES.mockGovernor,
      abi: MockGovernorABI,
      functionName: "createProposal",
      args: [desc],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Created proposal: "${desc.slice(0, 50)}..." (tx: ${receipt.transactionHash})`);
  }
  console.log();

  // Step 4: Children vote via Venice reasoning
  console.log("--- Step 4: Children voting via Venice AI ---");
  const proposalCount = (await publicClient.readContract({
    address: ADDRESSES.mockGovernor,
    abi: MockGovernorABI,
    functionName: "proposalCount",
  })) as bigint;

  for (const child of children) {
    for (let p = 1n; p <= proposalCount; p++) {
      const proposal = (await publicClient.readContract({
        address: ADDRESSES.mockGovernor,
        abi: MockGovernorABI,
        functionName: "getProposal",
        args: [p],
      })) as any;

      const systemPrompt = `You are governance agent "${child.ensLabel}". Vote according to the owner's values.`;

      console.log(`  ${child.ensLabel} evaluating proposal ${p}...`);
      const { decision, reasoning } = await reasonAboutProposal(
        proposal.description,
        values,
        systemPrompt
      );

      const support = decision === "FOR" ? 1 : decision === "AGAINST" ? 0 : 2;
      const encryptedRationale = toHex(reasoning);

      const hash = await walletClient.writeContract({
        address: child.childAddr,
        abi: ChildGovernorABI,
        functionName: "castVote",
        args: [p, support, encryptedRationale],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  ${child.ensLabel} voted ${decision} on proposal ${p}`);
    }
  }
  console.log();

  // Step 5: Parent evaluates alignment
  console.log("--- Step 5: Parent evaluating child alignment ---");
  for (const child of children) {
    const history = (await publicClient.readContract({
      address: child.childAddr,
      abi: ChildGovernorABI,
      functionName: "getVotingHistory",
    })) as any[];

    const historyForEval = history.map((v: any) => ({
      proposalId: v.proposalId.toString(),
      support: Number(v.support),
    }));

    const score = await evaluateAlignment(values, historyForEval);
    console.log(`  ${child.ensLabel}: alignment score = ${score}`);

    const hash = await walletClient.writeContract({
      address: child.childAddr,
      abi: ChildGovernorABI,
      functionName: "updateAlignmentScore",
      args: [BigInt(Math.min(score, 100))],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }
  console.log();

  console.log("=== Demo Complete ===");
  console.log("All votes cast onchain, all alignment scores updated.");
  console.log("Check Base Sepolia explorer for transaction details.");
}

main().catch(console.error);
