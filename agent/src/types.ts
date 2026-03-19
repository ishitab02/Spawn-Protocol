export interface ChildInfo {
  id: bigint;
  childAddr: `0x${string}`;
  governance: `0x${string}`;
  budget: bigint;
  maxGasPerVote: bigint;
  ensLabel: string;
  active: boolean;
}

export interface VoteRecord {
  proposalId: bigint;
  support: number;
  encryptedRationale: `0x${string}`;
  decryptedRationale: `0x${string}`;
  timestamp: bigint;
  revealed: boolean;
}

export interface ProposalInfo {
  id: bigint;
  description: string;
  startTime: bigint;
  endTime: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  executed: boolean;
}

export interface DeployedAddresses {
  mockGovernor: `0x${string}`;
  parentTreasury: `0x${string}`;
  childImplementation: `0x${string}`;
  spawnFactory: `0x${string}`;
  timeLock: `0x${string}`;
}
