"use client";

import { useState, useEffect, useCallback } from "react";
import { publicClient } from "@/lib/client";
import { CONTRACTS, GOVERNORS } from "@/lib/contracts";
import { SpawnFactoryABI, ChildGovernorABI } from "@/lib/abis";

export interface Proposal {
  id: bigint;
  description: string;
  startTime: bigint;
  endTime: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  executed: boolean;
  state: number;
  // Multi-DAO fields
  daoName: string;
  daoSlug: string;
  governorAddress: `0x${string}`;
  daoColor: string;
  daoBorderColor: string;
  // Unique key across DAOs
  uid: string;
}

interface RawProposal {
  id: bigint;
  description: string;
  startTime: bigint;
  endTime: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  executed: boolean;
}

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const allProposals: Proposal[] = [];

      await Promise.all(
        GOVERNORS.map(async (gov) => {
          try {
            const count = await publicClient.readContract({
              address: gov.address,
              abi: gov.abi,
              functionName: "proposalCount",
            });

            const total = Number(count);
            if (total === 0) return;

            const ids = Array.from({ length: total }, (_, i) => BigInt(i + 1));

            const results = await Promise.all(
              ids.map(async (id) => {
                const [rawProposal, state] = await Promise.all([
                  publicClient.readContract({
                    address: gov.address,
                    abi: gov.abi,
                    functionName: "getProposal",
                    args: [id],
                  }) as Promise<RawProposal>,
                  publicClient.readContract({
                    address: gov.address,
                    abi: gov.abi,
                    functionName: "state",
                    args: [id],
                  }),
                ]);

                return {
                  id: rawProposal.id,
                  description: rawProposal.description,
                  startTime: rawProposal.startTime,
                  endTime: rawProposal.endTime,
                  forVotes: rawProposal.forVotes,
                  againstVotes: rawProposal.againstVotes,
                  abstainVotes: rawProposal.abstainVotes,
                  executed: rawProposal.executed,
                  state: Number(state),
                  daoName: gov.name,
                  daoSlug: gov.slug,
                  governorAddress: gov.address,
                  daoColor: gov.color,
                  daoBorderColor: gov.borderColor,
                  uid: `${gov.slug}-${rawProposal.id.toString()}`,
                } satisfies Proposal;
              })
            );

            allProposals.push(...results);
          } catch {
            // If a governor is not deployed / unreachable, skip it gracefully
          }
        })
      );

      // Aggregate votes from ChildGovernor contracts (since children
      // record votes locally, not on MockGovernor)
      try {
        const rawChildren = await publicClient.readContract({
          address: CONTRACTS.SpawnFactory.address,
          abi: SpawnFactoryABI,
          functionName: "getActiveChildren",
        });

        for (const child of rawChildren) {
          try {
            const history = await publicClient.readContract({
              address: child.childAddr,
              abi: ChildGovernorABI,
              functionName: "getVotingHistory",
            });

            for (const vote of history) {
              // Find matching proposal across all governors
              const govAddr = child.governance.toLowerCase();
              const matching = allProposals.find(
                (p) =>
                  p.governorAddress.toLowerCase() === govAddr &&
                  p.id === vote.proposalId
              );
              if (matching) {
                if (vote.support === 1) matching.forVotes += BigInt(1);
                else if (vote.support === 0) matching.againstVotes += BigInt(1);
                else matching.abstainVotes += BigInt(1);
              }
            }
          } catch {}
        }
      } catch {}

      // Sort: newest first by startTime
      allProposals.sort((a, b) => {
        if (b.startTime > a.startTime) return 1;
        if (b.startTime < a.startTime) return -1;
        return 0;
      });

      setProposals(allProposals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch proposals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { proposals, loading, error, refetch: fetchData };
}
