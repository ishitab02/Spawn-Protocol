import {
  MockGovernorABI,
  ParentTreasuryABI,
  SpawnFactoryABI,
  ChildGovernorABI,
} from "./abis";

// Latest deployment — Base Sepolia (chain 84532)
// maxChildren=30, spawnChildWithOperator, 3 perspectives per DAO
export const CONTRACTS = {
  MockGovernor: {
    address: "0xd91e80324f0fa9fdefb64a46e68bcbe79a8b2ca9" as const,
    abi: MockGovernorABI,
  },
  ParentTreasury: {
    address: "0x9428b93993f06d3c5d647141d39e5ba54fb97a7b" as const,
    abi: ParentTreasuryABI,
  },
  SpawnFactory: {
    address: "0xfeb8d54149b1a303ab88135834220b85091d93a1" as const,
    abi: SpawnFactoryABI,
  },
  ChildGovernorImpl: {
    address: "0x9cc050508b7d7deea1d2cd81cea484eb3550fcf6" as const,
    abi: ChildGovernorABI,
  },
} as const;

export const GOVERNORS = [
  {
    name: "Uniswap DAO",
    slug: "uniswap",
    address: "0xd91e80324f0fa9fdefb64a46e68bcbe79a8b2ca9" as const,
    abi: MockGovernorABI,
    color: "text-pink-400",
    borderColor: "border-pink-400/30",
    bgColor: "bg-pink-400/5",
  },
  {
    name: "Lido DAO",
    slug: "lido",
    address: "0x40bae6f7d75c2600d724b4cc194e20e66f6386ac" as const,
    abi: MockGovernorABI,
    color: "text-blue-400",
    borderColor: "border-blue-400/30",
    bgColor: "bg-blue-400/5",
  },
  {
    name: "ENS DAO",
    slug: "ens",
    address: "0xb4e46e107fbd9b616b145adb91a5ffe0f5a2c42c" as const,
    abi: MockGovernorABI,
    color: "text-purple-400",
    borderColor: "border-purple-400/30",
    bgColor: "bg-purple-400/5",
  },
] as const;

// Celo Sepolia — latest deployment with operator auth (run-1773941913639)
export const CELO_CONTRACTS = {
  ParentTreasury: {
    address: "0x35ab52d20736886ebe3730f7fc2d6fa52c7159d4" as const,
    abi: ParentTreasuryABI,
  },
  SpawnFactory: {
    address: "0x8d3c3dbbc7a6f87feaf24282956ca8a014fe889a" as const,
    abi: SpawnFactoryABI,
  },
  ChildGovernorImpl: {
    address: "0xf0e256c1e4ca7f7c89cf369f5d1370f7cbbef076" as const,
    abi: ChildGovernorABI,
  },
} as const;

export const CELO_GOVERNORS = [
  {
    name: "Uniswap DAO",
    slug: "uniswap",
    address: "0x1e7d5f7c461d8f4678699669ace80e5e317b466f" as const,
    abi: MockGovernorABI,
    color: "text-pink-400",
    borderColor: "border-pink-400/30",
    bgColor: "bg-pink-400/5",
  },
  {
    name: "Lido DAO",
    slug: "lido",
    address: "0x349618bed66c73faca427da69a26cb8f7f91b9bb" as const,
    abi: MockGovernorABI,
    color: "text-blue-400",
    borderColor: "border-blue-400/30",
    bgColor: "bg-blue-400/5",
  },
  {
    name: "ENS DAO",
    slug: "ens",
    address: "0x1f54fd588a80bbde83d91003c043f21705814885" as const,
    abi: MockGovernorABI,
    color: "text-purple-400",
    borderColor: "border-purple-400/30",
    bgColor: "bg-purple-400/5",
  },
] as const;

export const EXPLORER_BASE = "https://sepolia.basescan.org";

export function explorerTx(hash: string): string {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

export function explorerAddress(address: string): string {
  return `${EXPLORER_BASE}/address/${address}`;
}

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Convert an ensLabel like "uniswap-dao-defi" to "uniswap-dao-defi.spawn.eth" */
export function ensName(ensLabel: string | undefined): string | null {
  if (!ensLabel || ensLabel === "") return null;
  return `${ensLabel}.spawn.eth`;
}

/** Resolve a governance contract address to a human-readable DAO name */
const GOVERNOR_NAMES: Record<string, string> = {
  // Base Sepolia
  "0xd91e80324f0fa9fdefb64a46e68bcbe79a8b2ca9": "Uniswap DAO",
  "0x40bae6f7d75c2600d724b4cc194e20e66f6386ac": "Lido DAO",
  "0xb4e46e107fbd9b616b145adb91a5ffe0f5a2c42c": "ENS DAO",
  // Celo Sepolia
  "0x1e7d5f7c461d8f4678699669ace80e5e317b466f": "Uniswap DAO",
  "0x349618bed66c73faca427da69a26cb8f7f91b9bb": "Lido DAO",
  "0x1f54fd588a80bbde83d91003c043f21705814885": "ENS DAO",
};

export function governorName(address: string): string | null {
  return GOVERNOR_NAMES[address.toLowerCase()] ?? null;
}

export function formatTimestamp(ts: bigint | number): string {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString();
}

export function supportLabel(support: number): string {
  if (support === 1) return "FOR";
  if (support === 0) return "AGAINST";
  return "ABSTAIN";
}

export function supportColor(support: number): string {
  if (support === 1) return "text-green-400";
  if (support === 0) return "text-red-400";
  return "text-yellow-400";
}

export function proposalStateLabel(state: number): string {
  const labels: Record<number, string> = {
    0: "Pending",
    1: "Active",
    2: "Defeated",
    3: "Succeeded",
    4: "Executed",
  };
  return labels[state] ?? "Unknown";
}

export function proposalStateColor(state: number): string {
  if (state === 1) return "text-blue-400 border-blue-400";
  if (state === 3 || state === 4) return "text-green-400 border-green-400";
  if (state === 2) return "text-red-400 border-red-400";
  return "text-gray-400 border-gray-400";
}
