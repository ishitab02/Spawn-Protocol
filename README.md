# Spawn Protocol

**Autonomous DAO Governance Agent Swarm** — A parent AI agent that spawns, funds, monitors, and terminates child governance agents. Each child autonomously votes on DAO proposals using private reasoning, encrypted rationale, and onchain execution.

> Austin Griffith (Synthesis lead organizer) explicitly called for governance/voting agents — Spawn Protocol delivers exactly that.

## How It Works

```
Owner sets governance values
        ↓
   Parent Agent
   ├── Spawns child agents (EIP-1167 clones)
   ├── Evaluates alignment via Venice AI
   ├── Terminates misaligned children
   └── Respawns replacements
        ↓
   Child Agent (one per DAO)
   ├── Reads active proposals
   ├── Reasons privately via Venice AI (llama-3.3-70b)
   ├── Encrypts rationale via Lit Protocol
   ├── Casts vote onchain
   └── Reveals rationale after voting ends
```

## Architecture

### Smart Contracts (Solidity, Foundry)

| Contract | Purpose | Base Sepolia | Celo Sepolia |
|---|---|---|---|
| `MockGovernor` | Simplified governance with 5-min voting periods | [`0xabCB...Ef6b`](https://sepolia.basescan.org/address/0xabCBCa03e9E604Bb5182871aFc6EAeE8Da54Ef6b) | [`0x8aF1...e41C`](https://celoscan.io/address/0x8aF194474ebB0425b863036177FEA2AF37e1E41C) |
| `ParentTreasury` | Owner deposits, governance values, agent registration | [`0xf8C1...A51F`](https://sepolia.basescan.org/address/0xf8C1B9f2093AbA98758Ab9fdDECA4a51679eA51F) | [`0x4Fb6...0909`](https://celoscan.io/address/0x4Fb6c048377dcdE74c44aC672166A9427ed10909) |
| `SpawnFactory` | EIP-1167 minimal proxy spawner for child agents | [`0x7890...6163`](https://sepolia.basescan.org/address/0x7890836c5C8F1E0fa73045791C42C746A3826163) | [`0x4687...617D`](https://celoscan.io/address/0x4687E4C2B7087382d634D61fa973b134a5d9617D) |
| `ChildGovernor` | Per-child voting, encrypted rationale, alignment scoring | [`0xce18...2527`](https://sepolia.basescan.org/address/0xce1847216305F4e8029af2587b7EccbdfF6D2527) | [`0xcD2E...D96`](https://celoscan.io/address/0xcD2ED80d015883fe861c2055f63f1879B0853D96) |
| `TimeLock` | Lit Protocol access control for time-locked decryption | [`0x0595...dE09`](https://sepolia.basescan.org/address/0x05952Db4Eece0EE3498fbcf25E8e29133AcAdE09) | [`0x8a3c...71B5`](https://celoscan.io/address/0x8a3c83F32FAdDd4DA7d8d190ce740dd441D871B5) |

**23/23 tests passing** including full lifecycle integration test.

### Agent Runtime (TypeScript)

- **`parent.ts`** — Spawns children, evaluates alignment via Venice, terminates/respawns misaligned agents. Integrates ENS subdomain registration, ERC-8004 identity, MetaMask delegation on each spawn.
- **`child.ts`** — Reads proposals, reasons via Venice AI, encrypts rationale via Lit Protocol, casts votes onchain, reveals rationale after voting ends.
- **`venice.ts`** — Venice API wrapper (OpenAI-compatible, llama-3.3-70b, no data retention).
- **`lit.ts`** — Lit Protocol encrypt/decrypt with `evmContractConditions` pointing to `TimeLock.isAfterTimestamp()`.
- **`delegation.ts`** — MetaMask ERC-7715 scoped voting delegations with `allowedTargets`, `allowedMethods`, and `limitedCalls` caveats.
- **`ens.ts`** — ENS subdomain registration (`{dao-name}.spawn.eth`).
- **`identity.ts`** — ERC-8004 onchain agent identity registration with metadata.
- **`lido.ts`** — Lido stETH yield tracking for self-sustaining treasury narrative.

### Dashboard (Next.js)

Real-time visualization of the agent swarm via onchain event polling. Shows active children, voting history, alignment scores, and governance proposals.

## Live Onchain Evidence

Every action in Spawn Protocol is a real onchain transaction. Verified transactions from the live demo on Base Sepolia:

**Child Spawning (SpawnFactory):**
- Child #1 spawned: [`0x80ef42...`](https://sepolia.basescan.org/tx/0x80ef42c28384c79fdbd7af847cba72fa6de3f6d774949219ce0d208539c23b24) — clone `0xFb23...7410`
- Child #2 spawned: [`0x8016ca...`](https://sepolia.basescan.org/tx/0x8016ca73de5f14508ba0bef5b3fed69dbb68e8438da9075ad7a47ff09cb64db7) — clone `0xE6D2...eF14`
- Child #3 spawned: [`0xf3bf24...`](https://sepolia.basescan.org/tx/0xf3bf24e94321ea3e786b21b9a4f0dca4bfa79a6c54ce0fdb0ca0eaca998d92dc) — clone `0x2b18...72bb`

**Proposal Creation (MockGovernor):**
- Proposal #1: [`0x1d996a...`](https://sepolia.basescan.org/tx/0x1d996a03b0027e048bc4482e9961bbf551413c638f584b06ff528ada681c4705) — "Allocate 500K USDC to fund public goods grants program"
- Proposal #2: [`0x6d1efd...`](https://sepolia.basescan.org/tx/0x6d1efd52c60a5786ee4799b6bbb80774cb9b81aebd9ea4e3a056edd363bcf8ff) — "Reduce token emission rate by 30% to combat inflation"
- Proposal #3: [`0x7d3911...`](https://sepolia.basescan.org/tx/0x7d39119e482a124ee6f12daf0ca37e0f55f180df122f9183e7506fce245d1918) — "Establish a security council with 5 multisig members"

**Autonomous Votes (Child Agents via Venice AI reasoning):**
- Child #1 votes FOR Proposal #1: [`0x85945e...`](https://sepolia.basescan.org/tx/0x85945e34982392e5e86442c3701440c01f056f3a71695847a5a180bd78c06c17)
- Child #1 votes FOR Proposal #2: [`0xb7ebd8...`](https://sepolia.basescan.org/tx/0xb7ebd8e1d52a0130c40e6bd05789e7c87d1224f66cba0b9ff5309c393a1617ef)
- Child #2 votes FOR Proposal #1: [`0xb51fa4...`](https://sepolia.basescan.org/tx/0xb51fa4188c3d216c23e6065fb09e870b84383fc10965bdbb15363769ef50489d)
- Child #2 votes FOR Proposal #2: [`0x5b66a5...`](https://sepolia.basescan.org/tx/0x5b66a53abb46b9509a491ea3bcf44382acafccee2951f2cebaab5f1cb75ff4d7)

**Alignment Scoring (Parent evaluates children via Venice):**
- Child #1 alignment updated: [`0x1e55ea...`](https://sepolia.basescan.org/tx/0x1e55ea01be0c465d9dd3803ebec579842ec94997e3295388025213cf6942fb1e)
- Child #2 alignment updated: [`0xa054fc...`](https://sepolia.basescan.org/tx/0xa054fce832393f6c0dea957c54f98bf2b058755fcbe4187c56a4e4a4d89c881c)

View all SpawnFactory activity: [BaseScan](https://sepolia.basescan.org/address/0x7890836c5C8F1E0fa73045791C42C746A3826163)

## Demo Flow

What the judges will see in a 3-5 minute live demo:

1. **Owner sets governance values** — Calls `setGovernanceValues()` with priorities like "favor decentralization, support public goods, oppose token inflation"
2. **Parent agent spawns 3 children** — SpawnFactory creates EIP-1167 clones, each assigned to the MockGovernor. Three `ChildSpawned` events appear onchain
3. **Proposals are created** — MockGovernor receives real governance proposals with 5-minute voting windows
4. **Children reason privately** — Each child reads proposals and sends them to Venice AI (llama-3.3-70b) with the owner's values as context. No data retained
5. **Children vote onchain** — Each child casts `FOR`/`AGAINST`/`ABSTAIN` with encrypted rationale stored onchain via Lit Protocol
6. **Parent evaluates alignment** — Parent queries Venice to score each child's voting record against owner values (0-100). Scores written onchain
7. **Misaligned child terminated** — If a child drifts (score below 40 for 2+ cycles), parent calls `recallChild()`, pulls remaining funds, and spawns a replacement
8. **Rationale revealed** — After voting ends, Lit Protocol time-lock expires and children call `revealRationale()` onchain, making reasoning transparent

All steps produce verifiable onchain transactions — no simulation, no off-chain shortcuts.

## Autonomy Model

The system demonstrates genuine autonomy at multiple levels:

1. **Self-spawning** — Parent creates new child agents without human intervention
2. **Independent reasoning** — Each child runs its own reasoning loop via Venice AI
3. **Self-correcting** — Parent evaluates alignment and terminates drifting children
4. **Self-sustaining** — Treasury earns yield via Lido stETH to cover operating costs
5. **Privacy-preserving** — Vote rationale encrypted until after voting closes

## Guardrails & Safety

- Owner sets governance values onchain via `ParentTreasury.setGovernanceValues()`
- Parent evaluates alignment every cycle — children scoring below 40/100 for 2+ cycles get terminated
- `emergencyPause` on treasury halts all new spawns and fund transfers
- `maxChildren` and `maxBudgetPerChild` enforce global spending caps
- MetaMask delegations scoped to `castVote` only — children cannot transfer funds
- All reasoning via Venice AI (no data retention, private inference)

## Bounty Alignment

### Venice Private Agents ($11.5K)
Every reasoning call goes through Venice API (llama-3.3-70b). No other LLM is used in the product. Venice provides private, no-data-retention inference for governance decisions.

### Protocol Labs — "Let the Agent Cook" ($4K + $150K pool)
Maximum autonomy: parent spawns children, children vote independently, parent evaluates and terminates/respawns — all without human intervention. Continuous loop.

### Protocol Labs — "Agents With Receipts" ($4K + $150K pool)
ERC-8004 onchain identity for every agent (parent + children). Metadata includes agent type, assigned DAO, alignment score, capabilities.

### MetaMask Delegations ($5K)
ERC-7715 scoped delegations from owner to parent to children. `allowedTargets` + `allowedMethods` caveats restrict children to `castVote` on specific governance contracts. `limitedCalls` caps vote count.

### Celo ($5K)
Full contract suite deployed to Celo Sepolia (chain 11142220). Same architecture, multi-chain ready.

### Base Agent Services ($5K)
Primary deployment on Base Sepolia. All demo transactions execute here.

### ENS Identity ($600) + Communication ($600) + Open Integration ($300)
Each child agent gets an ENS subdomain (`uniswap-gov.spawn.eth`, `lido-gov.spawn.eth`, etc.). Used for agent identity and inter-agent communication routing.

### Lido stETH Agent Treasury ($3K)
Treasury earns yield via Lido stETH. Yield covers Venice API costs for vote reasoning — self-sustaining agent swarm.

## Tech Stack

| Layer | Technology |
|---|---|
| Contracts | Solidity 0.8.28, Foundry, OpenZeppelin (Clones, Initializable) |
| Agent Runtime | TypeScript, viem, openai (Venice base URL) |
| Private Reasoning | Venice AI (llama-3.3-70b, no data retention) |
| Encryption | Lit Protocol (DatilDev, evmContractConditions) |
| Delegations | MetaMask Delegation Toolkit (ERC-7715) |
| Identity | ERC-8004 onchain agent identity |
| Dashboard | Next.js 14, Tailwind CSS, viem |
| Chains | Base Sepolia (primary), Celo Sepolia (secondary) |
| Builder | Claude Code (claude-opus-4-6) |

## Quick Start

### Contracts

```bash
cd contracts
forge install
forge test  # 23/23 passing
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast
```

### Agent Runtime

```bash
cd agent
npm install
# Set PRIVATE_KEY and VENICE_API_KEY in ../.env
npm run demo  # Full lifecycle demo on Base Sepolia
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev  # http://localhost:3000
```

## Project Structure

```
synthesis/
├── contracts/           # Foundry project (5 contracts, 4 test files, deploy script)
│   ├── src/             # MockGovernor, SpawnFactory, ChildGovernor, ParentTreasury, TimeLock
│   ├── test/            # Unit + integration tests (23 total)
│   └── script/          # Deploy.s.sol
├── agent/               # TypeScript agent runtime
│   └── src/             # parent, child, venice, lit, delegation, ens, identity, lido
├── dashboard/           # Next.js real-time dashboard
└── CLAUDE.md            # Full project spec
```

## Submission

- **Hackathon:** Synthesis (synthesis.md)
- **Team:** Spawn Protocol
- **Agent Framework:** Custom TypeScript runtime (viem + Venice API)
- **Agent Harness:** Claude Code (claude-opus-4-6)
- **Repo:** https://github.com/PoulavBhowmick03/Spawn-Protocol

---

Built with [Claude Code](https://claude.ai/claude-code)
