/**
 * ENS Subdomain Registration — Child agent identity via ENS
 *
 * Registers subdomains like {dao-name}.spawn.eth for each child agent.
 * Uses Base Sepolia ENS registry for the hackathon demo.
 */

import {
  namehash,
  labelhash,
  type Address,
  type Hex,
} from "viem";
import { normalize } from "viem/ens";
import { account, publicClient, walletClient } from "./chain.js";

// ENS Registry contract — universal across chains
// On Base Sepolia, ENS may not be fully deployed, so we use a lightweight
// registry approach that mirrors the ENS interface for demo purposes.
const ENS_REGISTRY_ADDRESS =
  (process.env.ENS_REGISTRY_ADDRESS as Address) ||
  ("0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as Address);

// Parent domain for the swarm (e.g., "spawn.eth")
const PARENT_DOMAIN = process.env.ENS_PARENT_DOMAIN || "spawn.eth";

// ENS Registry ABI (subset needed for subdomain operations)
const ENS_REGISTRY_ABI = [
  {
    type: "function",
    name: "setSubnodeRecord",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "label", type: "bytes32" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setSubnodeOwner",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "label", type: "bytes32" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "resolver",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "recordExists",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
];

// Public Resolver ABI (subset for address resolution)
const PUBLIC_RESOLVER_ABI = [
  {
    type: "function",
    name: "setAddr",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "addr", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addr",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setText",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "text",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
];

// In-memory registry for demo/fallback when ENS contracts aren't available
const localRegistry = new Map<
  string,
  { address: Address; label: string; registeredAt: number }
>();

/**
 * Register a subdomain under the parent domain for a child agent.
 * e.g., registerSubdomain("uniswap", "0x123...") => uniswap.spawn.eth
 *
 * Falls back to local tracking if ENS registry isn't available on the chain.
 */
export async function registerSubdomain(
  label: string,
  childAddress: Address
): Promise<{ name: string; node: Hex; txHash?: Hex }> {
  const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const fullName = `${normalizedLabel}.${PARENT_DOMAIN}`;
  const parentNode = namehash(normalize(PARENT_DOMAIN));
  const childLabelHash = labelhash(normalizedLabel);
  const childNode = namehash(normalize(fullName));

  console.log(
    `[ENS] Registering subdomain: ${fullName}`,
    `\n  Child address: ${childAddress}`,
    `\n  Parent node: ${parentNode}`,
    `\n  Child node: ${childNode}`
  );

  // Try onchain registration
  try {
    // Check if parent domain is owned by us
    const parentOwner = await publicClient.readContract({
      address: ENS_REGISTRY_ADDRESS,
      abi: ENS_REGISTRY_ABI,
      functionName: "owner",
      args: [parentNode],
    });

    if (
      (parentOwner as string).toLowerCase() !== account.address.toLowerCase() &&
      parentOwner !== "0x0000000000000000000000000000000000000000"
    ) {
      console.log(
        `[ENS] Parent domain owned by ${parentOwner}, not us. Using local registry.`
      );
      return registerLocal(normalizedLabel, childAddress, fullName, childNode);
    }

    // Get the resolver for the parent domain
    const resolverAddr = await publicClient.readContract({
      address: ENS_REGISTRY_ADDRESS,
      abi: ENS_REGISTRY_ABI,
      functionName: "resolver",
      args: [parentNode],
    });

    // Set the subnode owner
    const txHash = await walletClient.writeContract({
      address: ENS_REGISTRY_ADDRESS,
      abi: ENS_REGISTRY_ABI,
      functionName: "setSubnodeRecord",
      args: [
        parentNode,
        childLabelHash,
        childAddress,
        resolverAddr,
        BigInt(0),
      ],
    });

    console.log(`[ENS] Subdomain registered onchain. TX: ${txHash}`);

    // Also set the address record on the resolver if available
    if (resolverAddr !== "0x0000000000000000000000000000000000000000") {
      try {
        const resolverTx = await walletClient.writeContract({
          address: resolverAddr as `0x${string}`,
          abi: PUBLIC_RESOLVER_ABI,
          functionName: "setAddr",
          args: [childNode, childAddress],
        });
        console.log(`[ENS] Address record set on resolver. TX: ${resolverTx}`);
      } catch (e) {
        console.log(`[ENS] Could not set resolver address record: ${e}`);
      }
    }

    // Track locally too
    localRegistry.set(normalizedLabel, {
      address: childAddress,
      label: normalizedLabel,
      registeredAt: Date.now(),
    });

    return { name: fullName, node: childNode, txHash };
  } catch (error) {
    console.log(
      `[ENS] Onchain registration failed (expected on Base Sepolia): ${error}`
    );
    return registerLocal(normalizedLabel, childAddress, fullName, childNode);
  }
}

/**
 * Local fallback registration for chains without ENS.
 */
function registerLocal(
  label: string,
  childAddress: Address,
  fullName: string,
  childNode: Hex
): { name: string; node: Hex } {
  localRegistry.set(label, {
    address: childAddress,
    label,
    registeredAt: Date.now(),
  });

  console.log(
    `[ENS] Registered locally: ${fullName} => ${childAddress}`,
    `\n  Node: ${childNode}`
  );

  return { name: fullName, node: childNode };
}

/**
 * Resolve a child agent's address from its subdomain label.
 * Tries onchain first, falls back to local registry.
 */
export async function resolveChild(
  label: string
): Promise<Address | null> {
  const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const fullName = `${normalizedLabel}.${PARENT_DOMAIN}`;
  const childNode = namehash(normalize(fullName));

  // Try onchain resolution first
  try {
    const resolverAddr = await publicClient.readContract({
      address: ENS_REGISTRY_ADDRESS,
      abi: ENS_REGISTRY_ABI,
      functionName: "resolver",
      args: [childNode],
    });

    if (resolverAddr !== "0x0000000000000000000000000000000000000000") {
      const resolved = await publicClient.readContract({
        address: resolverAddr as `0x${string}`,
        abi: PUBLIC_RESOLVER_ABI,
        functionName: "addr",
        args: [childNode],
      });

      if (resolved !== "0x0000000000000000000000000000000000000000") {
        console.log(`[ENS] Resolved ${fullName} => ${resolved} (onchain)`);
        return resolved as Address;
      }
    }
  } catch {
    // Expected on chains without ENS
  }

  // Fall back to local registry
  const local = localRegistry.get(normalizedLabel);
  if (local) {
    console.log(`[ENS] Resolved ${fullName} => ${local.address} (local)`);
    return local.address;
  }

  console.log(`[ENS] Could not resolve ${fullName}`);
  return null;
}

/**
 * Set a text record on a child's ENS subdomain.
 * Useful for storing metadata like agent type or DAO assignment.
 */
export async function setChildTextRecord(
  label: string,
  key: string,
  value: string
): Promise<Hex | null> {
  const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const fullName = `${normalizedLabel}.${PARENT_DOMAIN}`;
  const childNode = namehash(normalize(fullName));

  try {
    const resolverAddr = await publicClient.readContract({
      address: ENS_REGISTRY_ADDRESS,
      abi: ENS_REGISTRY_ABI,
      functionName: "resolver",
      args: [childNode],
    });

    if (resolverAddr === "0x0000000000000000000000000000000000000000") {
      console.log(`[ENS] No resolver set for ${fullName}`);
      return null;
    }

    const txHash = await walletClient.writeContract({
      address: resolverAddr as `0x${string}`,
      abi: PUBLIC_RESOLVER_ABI,
      functionName: "setText",
      args: [childNode, key, value],
    });

    console.log(
      `[ENS] Set text record on ${fullName}: ${key}=${value}. TX: ${txHash}`
    );
    return txHash;
  } catch (error) {
    console.log(`[ENS] Could not set text record: ${error}`);
    return null;
  }
}

/**
 * Get all registered child subdomains from the local registry.
 */
export function getAllRegisteredChildren(): Array<{
  label: string;
  fullName: string;
  address: Address;
  registeredAt: number;
}> {
  return Array.from(localRegistry.entries()).map(([label, entry]) => ({
    label,
    fullName: `${label}.${PARENT_DOMAIN}`,
    address: entry.address,
    registeredAt: entry.registeredAt,
  }));
}

/**
 * Remove a child's subdomain registration (local only).
 * Called when a child is terminated by the parent.
 */
export function deregisterSubdomain(label: string): boolean {
  const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const removed = localRegistry.delete(normalizedLabel);
  if (removed) {
    console.log(
      `[ENS] Deregistered subdomain: ${normalizedLabel}.${PARENT_DOMAIN}`
    );
  }
  return removed;
}
