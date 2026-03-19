import { publicClient, walletClient, account } from "./chain.js";
import { ChildGovernorABI, MockGovernorABI } from "./abis.js";
import { reasonAboutProposal } from "./venice.js";
import { toHex } from "viem";
import type { DeployedAddresses, ProposalInfo } from "./types.js";

const CYCLE_INTERVAL_MS = 30_000;

export async function runChildLoop(
  childAddr: `0x${string}`,
  governanceAddr: `0x${string}`,
  governanceValues: string,
  childLabel: string
) {
  console.log(`[Child:${childLabel}] Starting child agent loop...`);
  console.log(`[Child:${childLabel}] Contract: ${childAddr}`);
  console.log(`[Child:${childLabel}] Governance: ${governanceAddr}`);

  const systemPrompt = `You are an autonomous governance agent named "${childLabel}".
You vote on DAO proposals according to your owner's values.
Be decisive and provide clear reasoning for your votes.
Your owner's governance values: ${governanceValues}`;

  while (true) {
    try {
      const isActive = (await publicClient.readContract({
        address: childAddr,
        abi: ChildGovernorABI,
        functionName: "active",
      })) as boolean;

      if (!isActive) {
        console.log(`[Child:${childLabel}] Deactivated. Exiting.`);
        break;
      }

      await childCycle(childAddr, governanceAddr, governanceValues, childLabel, systemPrompt);
    } catch (err) {
      console.error(`[Child:${childLabel}] Cycle error:`, err);
    }
    await sleep(CYCLE_INTERVAL_MS);
  }
}

async function childCycle(
  childAddr: `0x${string}`,
  governanceAddr: `0x${string}`,
  governanceValues: string,
  childLabel: string,
  systemPrompt: string
) {
  // 1. Get total proposal count
  const proposalCount = (await publicClient.readContract({
    address: governanceAddr,
    abi: MockGovernorABI,
    functionName: "proposalCount",
  })) as bigint;

  for (let i = 1n; i <= proposalCount; i++) {
    // 2. Check proposal state (1 = Active)
    const state = (await publicClient.readContract({
      address: governanceAddr,
      abi: MockGovernorABI,
      functionName: "state",
      args: [i],
    })) as number;

    if (state === 1) {
      // Active
      // Check if already voted
      const voteIndex = (await publicClient.readContract({
        address: childAddr,
        abi: ChildGovernorABI,
        functionName: "proposalToVoteIndex",
        args: [i],
      })) as bigint;

      if (voteIndex === 0n) {
        // Haven't voted yet
        const proposal = (await publicClient.readContract({
          address: governanceAddr,
          abi: MockGovernorABI,
          functionName: "getProposal",
          args: [i],
        })) as ProposalInfo;

        console.log(
          `[Child:${childLabel}] Evaluating proposal ${i}: ${proposal.description}`
        );

        // 3. Reason via Venice
        const { decision, reasoning } = await reasonAboutProposal(
          proposal.description,
          governanceValues,
          systemPrompt
        );

        const support = decision === "FOR" ? 1 : decision === "AGAINST" ? 0 : 2;
        console.log(`[Child:${childLabel}] Decision: ${decision}`);
        console.log(`[Child:${childLabel}] Reasoning: ${reasoning.slice(0, 100)}...`);

        // 4. Encrypt rationale (for now, just hex encode — Lit Protocol integration in Phase 2)
        const encryptedRationale = toHex(reasoning);

        // 5. Cast vote onchain
        const hash = await walletClient.writeContract({
          address: childAddr,
          abi: ChildGovernorABI,
          functionName: "castVote",
          args: [i, support, encryptedRationale],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(
          `[Child:${childLabel}] Voted ${decision} on proposal ${i} (tx: ${receipt.transactionHash})`
        );
      }
    }

    // Check for proposals where voting ended — reveal rationale
    if (state >= 2) {
      // Defeated, Succeeded, or Executed
      const voteIndex = (await publicClient.readContract({
        address: childAddr,
        abi: ChildGovernorABI,
        functionName: "proposalToVoteIndex",
        args: [i],
      })) as bigint;

      if (voteIndex > 0n) {
        const history = (await publicClient.readContract({
          address: childAddr,
          abi: ChildGovernorABI,
          functionName: "getVotingHistory",
        })) as any[];

        const record = history[Number(voteIndex - 1n)];
        if (!record.revealed) {
          console.log(
            `[Child:${childLabel}] Revealing rationale for proposal ${i}`
          );

          // In Phase 2, this will decrypt via Lit Protocol
          // For now, the encrypted rationale IS the rationale (just hex-encoded)
          const hash = await walletClient.writeContract({
            address: childAddr,
            abi: ChildGovernorABI,
            functionName: "revealRationale",
            args: [i, record.encryptedRationale],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          console.log(`[Child:${childLabel}] Rationale revealed for proposal ${i}`);
        }
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { childCycle };
