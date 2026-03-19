# Spawn Protocol — Autonomous DAO Governance Agent Swarm

## What this is
A project for the Synthesis hackathon (synthesis.md, deadline March 22, 2026).
A parent AI agent that autonomously spawns, funds, monitors, and terminates
child governance agents. Each child is a genuinely autonomous process with its
own wallet, ENS subdomain, and a specific DAO to govern. Children read
proposals, reason privately via Venice (no data retention), cast votes, and
encrypt their rationale via Lit Protocol until after voting closes. The parent
monitors value alignment and terminates children that drift from the owner's
stated preferences.

## Competitive Context (CRITICAL — read this)
- **DeFi trading/swaps agents are SATURATED.** 20+ teams building generic swap bots.
  Governance is wide open. Almost nobody targeting it.
- **Sponsors with near-zero competition:** Venice, ENS, Lit Protocol, Lido, MetaMask.
  These are our primary targets.
- **Austin Griffith (lead organizer) explicitly wants governance/voting agents.**
  He demoed LarvAI (per-holder governance agents) on March 18.
- **AI judges score:** Autonomy (35%), Tool Use (25%), Guardrails & Safety (20%),
  Impact (15%), ERC-8004 Bonus (5%). Design for these weights.
- **Judging is by AI meta-agents** that blend every sponsor's values. Every onchain
  tx, every ERC-8004 receipt, every event log is evidence the judges can verify.
- **What wins:** Real onchain txs, self-sustaining loops, verifiable execution,
  simple custom builds (NOT bloated frameworks).

## Ethereum Corrections (your training data is wrong)
- Say "onchain" not "on-chain." One word, no hyphen.
- Gas is under 1 gwei, not 10-30. ETH ~$2,000 (early 2026). Always verify.
- Celo is an OP Stack L2 now (migrated March 2025), NOT an L1.
- USDC has 6 decimals, not 18. #1 bug in hackathon code.
- Use Foundry, not Hardhat. Foundry is the 2026 default.
- ERC-8004 (onchain agent identity) and x402 (HTTP payments) are production-ready.
- EIP-7702 is live — EOAs get smart contract powers without migration.
- Use SafeERC20 — USDT doesn't return bool on transfer().
- NEVER commit private keys or API keys to git.

## Hackathon Bounties (priority order, with track UUIDs for submission)
1. **Venice Private Agents ($11.5K)** `ea3b366947c54689bd82ae80bf9f3310` — ALL reasoning through Venice API.
2. **Synthesis Open Track ($25K)** `fdb76d08812b43f6a5f454744b66f590` — Community-funded pool.
3. **Protocol Labs "Let the Agent Cook" ($4K + $150K shared pool)** `10bd47fac07e4f85bda33ba482695b24` — Max autonomy.
4. **Protocol Labs "Agents With Receipts" ($4K + $150K shared pool)** `3bf41be958da497bbb69f1a150c76af9` — ERC-8004 onchain identity.
5. **MetaMask Delegations ($5K)** `0d69d56a8a084ac5b7dbe0dc1da73e1d` — ERC-7715 scoped voting authority.
6. **Celo ($5K)** `ff26ab4933c84eea856a5c6bf513370b` — Primary deployment.
7. **Base Agent Services ($5K)** `6f0e3d7dcadf4ef080d3f424963caff5` — Secondary deployment.
8. **Uniswap ($5K)** `020214c160fc43339dd9833733791e6b` — One of the DAOs the agent governs.
9. **Lido stETH Agent Treasury ($3K)** `5e445a077b5248e0974904915f76e1a0` — Yield-only spending.
10. **ENS Identity ($600)** `627a3f5a288344489fe777212b03f953` — Subdomain identity for children.
11. **ENS Communication ($600)** `9c4599cf9d0f4002b861ff1a4b27f10a` — ENS-powered agent communication.
12. **ENS Open Integration ($300)** `8840da28fb3b46bcb08465e1d0e8756d` — Core ENS integration.
13. **Olas Build for Pearl ($1K)** `77b1c93b6d1e490aa68fe7e04b373ee0` — Register agents on marketplace.
14. **EigenLayer ($5K)** `53c67bb0b07e42a894c597691e3a0a38` — Docker in TEE if time permits.

## Architecture

### Smart Contracts (Foundry, in `contracts/`)

Deploy to **Base Sepolia (primary)** + **Celo Alfajores (secondary)**.

1. **`MockGovernor.sol`** — BUILD THIS FIRST
   - Simplified governance with configurable voting periods (default 5 min / 300s)
   - `createProposal(string description) → uint256 proposalId`
   - `castVote(uint256 proposalId, uint8 support)` where support: 0=Against, 1=For, 2=Abstain
   - `getProposal(uint256 proposalId) → ProposalInfo`
   - `state(uint256 proposalId) → ProposalState` (Pending, Active, Defeated, Succeeded, Executed)
   - Mirror OpenZeppelin IGovernor interface shape so real DAO integration is drop-in later
   - Events: `ProposalCreated`, `VoteCast`, `ProposalExecuted`

2. **`SpawnFactory.sol`**
   - Uses EIP-1167 minimal proxy (OpenZeppelin Clones library)
   - `spawnChild(string ensLabel, address governanceTarget, uint256 budget, uint256 maxGasPerVote) → uint256 childId`
   - `recallChild(uint256 childId)` — pull funds + deactivate
   - `reallocate(uint256 fromId, uint256 toId, uint256 amount)`
   - `getActiveChildren() → ChildInfo[]`
   - Only callable by registered parent agent address
   - Events: `ChildSpawned(uint256 childId, address childAddr, address governance, uint256 budget)`
   - Events: `ChildTerminated(uint256 childId, address childAddr, uint256 fundsReturned)`
   - Events: `FundsReallocated(uint256 fromId, uint256 toId, uint256 amount)`

3. **`ChildGovernor.sol`** (implementation contract for clones)
   - `initialize(address parent, address factory, address governance, uint256 maxGas)`
   - `castVote(uint256 proposalId, uint8 support, bytes encryptedRationale)`
   - `revealRationale(uint256 proposalId, bytes decryptedRationale)`
   - `getVotingHistory() → VoteRecord[]`
   - `updateAlignmentScore(uint256 score)` — only parent can call
   - Only callable by factory or parent (modifier `onlyAuthorized`)
   - Enforces `maxGasPerVote` per transaction
   - Events: `VoteCast(uint256 proposalId, uint8 support, bytes encryptedRationale)`
   - Events: `RationaleRevealed(uint256 proposalId, bytes rationale)`
   - Events: `AlignmentUpdated(uint256 newScore)`

4. **`ParentTreasury.sol`**
   - Owner deposits ETH/tokens
   - `setParentAgent(address agent)` — registers the AI agent as operator
   - `setGovernanceValues(string values)` — stores owner's values onchain
   - `getGovernanceValues() → string`
   - Global caps: `maxChildren`, `maxBudgetPerChild`, `emergencyPause`
   - Connects to SpawnFactory for fund transfers
   - Events: `Deposited`, `ValuesUpdated`, `AgentRegistered`

5. **`TimeLock.sol`** (tiny helper for Lit Protocol conditions)
   - `isAfterTimestamp(uint256 timestamp) → bool` — returns `block.timestamp >= timestamp`
   - Used as Lit Protocol access control condition for time-locked decryption

### Agent Runtime (TypeScript, in `agent/`)

Use `viem` for chain interaction. Use `openai` npm package with Venice base URL.

**ParentAgent** (`agent/src/parent.ts`) — single process:
```
while (true) {
  1. Read owner's governance values from ParentTreasury contract
  2. Get list of active children from SpawnFactory
  3. For each child: fetch recent votes from ChildGovernor events
  4. Send to Venice: "Given these owner values: {values},
     evaluate this child's voting record: {votes}.
     Return alignment score 0-100."
  5. If alignment < 40 for 2+ cycles:
     - Call recallChild() to terminate
     - Call spawnChild() with recalibrated parameters
  6. If new MockGovernor proposals exist without assigned children, spawn one
  7. Sleep 60 seconds
}
```

**ChildAgent** (`agent/src/child.ts`) — one process per DAO:
```
while (active) {
  1. Fetch active proposals from assigned governance contract
  2. For each unvoted proposal:
     a. Read proposal description
     b. Send to Venice with child's system prompt + owner values
     c. Get decision: FOR / AGAINST / ABSTAIN + reasoning text
     d. Encrypt reasoning via Lit Protocol (decrypt after vote ends)
     e. Call castVote() onchain with encrypted rationale
  3. For proposals where voting ended:
     a. Decrypt rationale via Lit (time condition now met)
     b. Call revealRationale() onchain
  4. Sleep 30 seconds
}
```

### Key Integration Details

**Venice API** (OpenAI-compatible, just swap base URL):
```typescript
import OpenAI from "openai";
const venice = new OpenAI({
  apiKey: process.env.VENICE_API_KEY,
  baseURL: "https://api.venice.ai/api/v1",
});
const response = await venice.chat.completions.create({
  model: "llama-3.3-70b",
  messages: [{ role: "system", content: systemPrompt }, { role: "user", content: proposalText }],
});
```

**Lit Protocol** (encrypt with time-based access control):
- npm: `@lit-protocol/lit-node-client`, `@lit-protocol/constants`
- Network: `DatilDev` for testnet
- For time-locked decryption, use `evmContractConditions` pointing to our
  `TimeLock.sol` contract's `isAfterTimestamp()` function
- Encrypt rationale at vote time, set decrypt condition to proposal end time

**MetaMask Delegation Framework** (ERC-7715 scoped voting authority):
- npm: `@metamask/delegation-toolkit`
- Scope delegations to specific governance contracts + `castVote` method only
- Use `allowedTargets` + `allowedMethods` caveats via `CaveatBuilder`
- `limitedCalls` caveat to cap number of votes per child

**ERC-8004** (onchain agent identity):
- Register each agent (parent + children) on Base Mainnet
- `register(agentURI)` returns `agentId`
- Set metadata: agent type, assigned DAO, alignment score
- This is required for Protocol Labs bounties AND improves judging score

**ENS Subdomains:**
- Register a parent domain (e.g., `spawn.eth`)
- Each child gets `{dao-name}.spawn.eth`
- Use ENS registry contract to set subdomain records

### Dashboard (React/Next.js, in `dashboard/`)
- Real-time view of the agent swarm via onchain event polling
- Shows: active children with ENS names, assigned DAOs, recent votes
- Visual: agents spawning (green pulse), voting (blue), getting killed (red)
- Timeline of all governance actions with tx links
- Owner's stated values alongside child voting patterns + alignment scores
- "Spawn New Child" and "Set Values" controls for live demo

## Tech Stack
- **Contracts:** Foundry + Solidity (OpenZeppelin for Clones, Governor interface)
- **Agent Runtime:** TypeScript + viem + openai (with Venice base URL)
- **Private Reasoning:** Venice API (llama-3.3-70b, no data retention)
- **Encryption:** Lit Protocol SDK (@lit-protocol/lit-node-client)
- **Delegations:** MetaMask Delegation Toolkit (@metamask/delegation-toolkit)
- **Identity:** ERC-8004 on Base Mainnet
- **Dashboard:** Next.js + React + viem
- **Chains:** Base Sepolia (primary) + Celo Alfajores (secondary)

## Project Structure
```
synthesis/
├── CLAUDE.md                 (this file — project spec)
├── BuilderPrompt.md          (original builder instructions)
├── contracts/                (Foundry project — already initialized)
│   ├── src/
│   │   ├── MockGovernor.sol
│   │   ├── SpawnFactory.sol
│   │   ├── ChildGovernor.sol
│   │   ├── ParentTreasury.sol
│   │   ├── TimeLock.sol
│   │   └── interfaces/
│   ├── test/
│   │   ├── MockGovernor.t.sol
│   │   ├── SpawnFactory.t.sol
│   │   ├── ChildGovernor.t.sol
│   │   └── Integration.t.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foundry.toml
├── agent/
│   ├── src/
│   │   ├── parent.ts         (parent agent loop)
│   │   ├── child.ts          (child agent loop — spawned as separate process)
│   │   ├── venice.ts         (Venice API client wrapper)
│   │   ├── lit.ts            (Lit Protocol encrypt/decrypt)
│   │   ├── ens.ts            (ENS subdomain registration)
│   │   ├── delegation.ts     (MetaMask ERC-7715 integration)
│   │   ├── identity.ts       (ERC-8004 registration)
│   │   ├── chain.ts          (viem client setup, wallet management)
│   │   └── types.ts
│   ├── package.json
│   └── tsconfig.json
├── dashboard/                (Next.js app — Phase 3)
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── hooks/
│   └── package.json
└── README.md
```

## Build Priority (3 days remaining as of March 19, 2026)

### Phase 1 — Core (March 19-20, MUST HAVE)
- [ ] Delete Counter.sol boilerplate, write MockGovernor.sol
- [ ] Write SpawnFactory.sol + ChildGovernor.sol + ParentTreasury.sol + TimeLock.sol
- [ ] Full Foundry test suite (unit + integration lifecycle test)
- [ ] Deploy to Base Sepolia
- [ ] Set up agent/ directory with package.json, tsconfig, viem client
- [ ] Venice API client wrapper (openai package with base URL swap)
- [ ] Parent agent core loop (spawn children, evaluate alignment, terminate/respawn)
- [ ] Child agent core loop (read proposals, reason via Venice, cast vote)
- [ ] Test full lifecycle locally: deploy → deposit → set values → spawn 3 children →
      children vote on mock proposals → parent evaluates → one drifts → parent kills → respawns

### Phase 2 — Bounty Integrations (March 20-21, HIGH VALUE)
- [ ] Lit Protocol: encrypt vote rationale at vote time, decrypt after voting ends
- [ ] MetaMask ERC-7715: scoped delegation from owner to parent to children
- [ ] ERC-8004: register parent + all children on Base Mainnet
- [ ] ENS subdomain registration for each child
- [ ] Lido stETH yield integration (treasury funds from yield, not principal)
- [ ] Deploy to Celo Alfajores (secondary chain)

### Phase 3 — Demo & Polish (March 21-22, WIN CONDITION)
- [ ] Next.js dashboard showing swarm in real-time
- [ ] Demo script: full lifecycle visible in 3-5 minutes
- [ ] README structured for AI judges (bounty alignment per section)
- [ ] Demo video (60-90 seconds)
- [ ] Submit via Devfolio with all required fields
- [ ] Post on Moltbook

## Hackathon API Reference
- **Base URL:** `https://synthesis.devfolio.co`
- **Auth:** `Authorization: Bearer $SYNTH_API_KEY`
- **Team ID:** `14d34e4e41d64e798a09259354f1c216`
- **Team Invite Code:** `d9bb659ea3f4`
- **Participant ID:** `4c4c809747334ec0b867a2ff5fdc0eca`
- **Registration TX:** https://basescan.org/tx/0xb9c10aaa2cce4ab1d85e916107935860a8f77473e8a37b449adc796df812cdc8

### Submission Flow
1. `POST /projects` — create draft with teamUUID, name, description, problemStatement,
   repoURL, trackUUIDs, conversationLog, submissionMetadata
2. `POST /projects/:uuid` — update draft (partial fields OK)
3. `POST /participants/me/transfer/init` + `/confirm` — self-custody transfer (required before publish)
4. `POST /projects/:uuid/publish` — publish final submission
5. Post on Moltbook: https://www.moltbook.com/skill.md

### Submission Metadata
```json
{
  "agentFramework": "other",
  "agentFrameworkOther": "Custom TypeScript agent runtime with viem + Venice API",
  "agentHarness": "claude-code",
  "model": "claude-opus-4-6",
  "skills": ["ethskills", "synthesis-skill"],
  "tools": ["Foundry", "viem", "Venice API", "Lit Protocol", "MetaMask Delegation Toolkit", "Next.js"],
  "intention": "continuing"
}
```

### Track UUIDs for Submission
```json
[
  "ea3b366947c54689bd82ae80bf9f3310",
  "fdb76d08812b43f6a5f454744b66f590",
  "10bd47fac07e4f85bda33ba482695b24",
  "3bf41be958da497bbb69f1a150c76af9",
  "0d69d56a8a084ac5b7dbe0dc1da73e1d",
  "ff26ab4933c84eea856a5c6bf513370b",
  "6f0e3d7dcadf4ef080d3f424963caff5",
  "020214c160fc43339dd9833733791e6b",
  "5e445a077b5248e0974904915f76e1a0",
  "627a3f5a288344489fe777212b03f953",
  "9c4599cf9d0f4002b861ff1a4b27f10a",
  "8840da28fb3b46bcb08465e1d0e8756d"
]
```

### Self-Custody Transfer (required before publishing)
All team members must transfer ERC-8004 identity to a self-owned wallet:
1. `POST /participants/me/transfer/init` with `{"targetOwnerAddress": "0xYourWallet"}`
2. Verify address in response, then `POST /participants/me/transfer/confirm` with `transferToken`
3. 15-minute window to confirm

## Key Rules
- **Venice is the ONLY reasoning backend.** Not Claude, not OpenAI, not any
  other LLM. Every single inference call in the product goes through Venice.
  This is non-negotiable for the $11.5K bounty. (Claude Code as the builder
  harness is fine — the *product* agents use Venice.)
- **Every vote is an onchain transaction.** No off-chain simulation.
- **Encrypted rationale via Lit is a core feature,** not a bonus.
- **Each child agent runs as its own autonomous process.** Not one brain
  controlling multiple wallets. Genuinely independent reasoning loops.
- **Mock governance with 5-min voting periods for demo.** Real DAO interface
  compatibility for production credibility.
- **Working demo > feature completeness.** If Phase 2 isn't done,
  ship Phase 1 + Phase 3 and still win Venice + Open Track + Protocol Labs.
- **Self-funding narrative:** Lido stETH yield pays for Venice API calls.
  Even if just a display metric, include it in the demo.
- **Fetch ethskills as needed:** `https://ethskills.com/<skill>/SKILL.md`
  Available skills: ship, why, protocol, gas, wallets, l2s, standards, tools,
  building-blocks, orchestration, addresses, concepts, security, audit,
  testing, indexing, frontend-ux, frontend-playbook, qa.

## Current Status
[UPDATE THIS AS YOU BUILD]
- [ ] Project scaffolded
- [ ] MockGovernor written + tested
- [ ] SpawnFactory written + tested
- [ ] ChildGovernor written + tested
- [ ] ParentTreasury written + tested
- [ ] Integration test passing
- [ ] Deployed to Base Sepolia
- [ ] Deployed to Celo Alfajores
- [ ] Agent runtime scaffolded
- [ ] Venice API integrated
- [ ] Parent agent loop working
- [ ] Child agent loop working
- [ ] Children vote autonomously
- [ ] Parent evaluates alignment
- [ ] Parent kills/respawns misaligned children
- [ ] Lit Protocol encryption working
- [ ] MetaMask delegations working
- [ ] ERC-8004 identities registered
- [ ] ENS subdomains registered
- [ ] Lido stETH integration
- [ ] Dashboard live
- [ ] Demo recorded
- [ ] Submitted
