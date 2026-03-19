# BUILDER PROMPT — Paste this into OpenClaw or Claude Code

Read the CLAUDE.md in this project root first. That's your bible.

You are building Spawn Protocol for the Synthesis hackathon.
Deadline: March 22, 2026. We have ~72 hours.

## START HERE — Phase 1 (next 12 hours)

### Step 1: Scaffold the monorepo

```
spawn-protocol/
├── CLAUDE.md              (already exists)
├── contracts/             (Foundry project)
│   ├── src/
│   │   ├── SpawnFactory.sol
│   │   ├── ChildGovernor.sol
│   │   ├── ParentTreasury.sol
│   │   ├── MockGovernor.sol
│   │   └── interfaces/
│   ├── test/
│   │   ├── SpawnFactory.t.sol
│   │   ├── ChildGovernor.t.sol
│   │   └── Integration.t.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foundry.toml
├── agent/
│   ├── src/
│   │   ├── parent.ts        (parent agent loop)
│   │   ├── child.ts         (child agent loop)
│   │   ├── venice.ts        (Venice API client)
│   │   ├── lit.ts           (Lit Protocol encryption)
│   │   ├── ens.ts           (ENS subdomain registration)
│   │   ├── chain.ts         (viem client setup)
│   │   └── types.ts
│   ├── package.json
│   └── tsconfig.json
├── dashboard/               (React/Next.js — Phase 3)
└── README.md
```

### Step 2: Write the contracts

Start with MockGovernor.sol — we need this for everything else to work.
Keep it simple: createProposal(), castVote(), executeProposal().
Voting period = 5 minutes (300 seconds) for demo purposes.
Follow OpenZeppelin Governor interface shape so real DAO integration
is a drop-in later.

Then SpawnFactory.sol:
- Uses EIP-1167 minimal proxy pattern (OpenZeppelin Clones library)
- spawnChild(string memory ensLabel, address governanceTarget,
  uint256 budget, uint256 maxGasPerVote) external onlyParentAgent
- recallChild(uint256 childId) external onlyParentAgent
- reallocate(uint256 fromId, uint256 toId, uint256 amount) external onlyParentAgent
- getActiveChildren() external view returns (ChildInfo[] memory)
- Events: ChildSpawned, ChildTerminated, FundsReallocated

Then ChildGovernor.sol:
- initialize(address parent, address governance, uint256 maxGas)
- castVote(uint256 proposalId, uint8 support, bytes calldata encryptedRationale)
- revealRationale(uint256 proposalId, bytes calldata decryptedRationale)
- getVotingHistory() external view returns (VoteRecord[] memory)
- Only callable by parent contract (modifier onlyParent)
- Events: VoteCast, RationaleRevealed

Then ParentTreasury.sol:
- Owner deposits ETH/tokens
- Sets parent agent address as operator
- Stores owner values hash on-chain
- Global caps: maxChildren, maxBudgetPerChild, emergencyPause
- Connects to SpawnFactory

Write comprehensive tests for every function. Test the full lifecycle:
deploy factory -> deposit to treasury -> spawn 3 children ->
children vote on mock proposals -> parent recalls one child ->
parent spawns replacement.

### Step 3: Deploy to Celo Alfajores

Set up foundry.toml with Celo Alfajores RPC.
Write Deploy.s.sol that deploys everything in order.
Verify contracts on Celoscan.

### Step 4: Build the parent agent

TypeScript. Use viem for chain interaction. The parent agent loop:

```
while (true) {
  // 1. Check owner's stated values (from treasury contract)
  // 2. Get list of active children
  // 3. For each child, fetch recent voting history
  // 4. Send to Venice API: "Given owner values: {values},
  //    evaluate this child's voting record: {votes}.
  //    Alignment score 0-100. If below 40, recommend termination."
  // 5. If any child below threshold, call recallChild() + spawnChild()
  //    with recalibrated system prompt
  // 6. If new proposals detected on any DAO, ensure appropriate
  //    child exists. If not, spawn one.
  // 7. Sleep 60 seconds
}
```

Venice API setup — this is just an OpenAI-compatible endpoint:
```typescript
const venice = new OpenAI({
  apiKey: process.env.VENICE_API_KEY,
  baseURL: "https://api.venice.ai/api/v1"
});

const response = await venice.chat.completions.create({
  model: "llama-3.3-70b", // or whatever Venice offers
  messages: [
    { role: "system", content: childSystemPrompt },
    { role: "user", content: proposalText }
  ]
});
```

### Step 5: Build the child agent

Each child is a separate async process. The loop:

```
while (active) {
  // 1. Fetch active proposals from assigned governance contract
  // 2. For each unvoted proposal:
  //    a. Read proposal details
  //    b. Reason about it via Venice (private inference)
  //    c. Decide: FOR, AGAINST, ABSTAIN
  //    d. Generate reasoning text
  //    e. Encrypt reasoning via Lit Protocol
  //    f. Call castVote() on ChildGovernor contract with encrypted rationale
  // 3. Check for any proposals where voting ended:
  //    a. Decrypt rationale via Lit
  //    b. Call revealRationale() on-chain
  // 4. Sleep 30 seconds
}
```

## IMPORTANT REMINDERS

- Venice API is the ONLY LLM. Not Claude, not OpenAI. Every single
  reasoning call goes through Venice. This is worth $11.5K.
- Test everything on Celo Alfajores before moving on.
- If you get stuck on Lit Protocol or ENS integration, skip it
  temporarily and come back. Core loop (spawn + vote + evaluate) is
  the priority.
- Keep contracts simple. No over-engineering. Hackathon code.
- Every contract function that does something should emit an event.
  The dashboard and the AI judges both need on-chain proof.
- Use the MockGovernor for all demos. 5-minute voting periods.
  Create 3-4 interesting fake proposals about things like
  "Should the DAO allocate 10% of treasury to public goods?"

GO BUILD. Start with `forge init contracts` and write MockGovernor.sol.