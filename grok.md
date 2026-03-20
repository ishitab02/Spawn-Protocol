# Grok Evaluation — Spawn Protocol

**Date:** 2026-03-20
**Evaluator:** Grok (xAI)
**Overall Grade:** B+

---

## Summary

Spawn Protocol is a legitimately strong, over-engineered submission with real onchain teeth — but it has polishing gaps and overclaims that Bonfires AI judges (plus humans) will sniff out in the final 48 hours. It is one of the few entries visibly executing a full persistent swarm with 1,418+ deployer txs on Base Sepolia, actual child spawns, ERC-8004 registrations, scoped delegations, and live Venice-driven votes. That volume alone puts it in the top tier of "Agents With Receipts" and "Let the Agent Cook." However, ENS is a custom mimic (not official ENS), Lido yield is simulated with zero visible withdrawals, some addresses drift across files, and the governance targets are all mocks — which risks the "real-world utility" hammer on Celo/Lido/Open.

---

## Track-by-Track Scores

| Track | Score | Prize | Verdict |
|---|---|---|---|
| Venice Private Agents | 9/10 | $11,500 | Venice is the ONLY reasoning engine. 6 distinct call types. Load-bearing. |
| PL "Let the Agent Cook" | 9/10 | $4,000 | Complete decision loop. Truly autonomous. Only missing: live Tally on real DAOs. |
| PL "Agents With Receipts" | 10/10 | $4,000 | Strongest entry on verifiability. agent.json perfection. Comprehensive tx hashes. |
| ENS ($1,500 combined) | 6/10 | $1,500 | Custom mimic, not real ENS. No subdomain txs visible in logs. Claim inflated. |
| MetaMask Delegations | 7/10 | $5,000 | Correct caveats but enforcement is offchain. Not "dream-tier." |
| Celo | 5/10 | $5,000 | Deployed but zero visible activity. Weakest track fit. |
| Lido stETH | 7/10 | $3,000 | Contract real, spec matches. But zero onchain yield withdrawals visible. |
| Open Track | 8/10 | $25,000 | Broad cross-sponsor appeal. Strong contender if polished. |

---

## Win Probabilities (Top 3 Placement)

| Track | Probability |
|---|---|
| PL "Agents With Receipts" | 65% (strongest shot) |
| PL "Let the Agent Cook" | 55% |
| Venice | 45% |
| Open Track | 40% |
| MetaMask | 35% |
| ENS | 30% |
| Lido | 25% |
| Celo | 15% |

**Expected prize winnings:** $4,500–$7,500

---

## Weaknesses (Brutally Honest)

1. **README claims not fully backed**: ENS "subdomains registered via custom SpawnENSRegistry" — custom only, no real ENS. Lido "yield withdrawn" — no evidence visible. Some contract addresses in README/agent.json outdated vs live SpawnFactory. SpawnFactory source unverified on Basescan.

2. **Decorative vs load-bearing**: Delegation caveats correct but not enforced in actual vote txs. ENS custom mimic. Tally discovery claimed but votes on MockGovernor only. Lit encryption in code but not core to every vote.

3. **AI judge red flags**: Mock-only governors + simulated Lido yield + custom ENS + address drift = "inflated architecture, light on real utility." Bonfires agents will cross-reference logs vs onchain and flag testnet sims hard.

4. **No major fakes**, but selective emphasis. The "700+ txs" is real (1,418) — credit where due.

---

## Competitor Analysis

X/Twitter sentiment: ~15-20 active projects visible. Heavy on payments (Locus/Bankr), trust/audit (EMET trust-gate, StableShield ERC-8004 wallet auditor), trading bots, and commerce (Virtuals).

**Governance/DAO voting agents? Almost zero direct competitors.**

Strongest rivals: StableShield (ERC-8004 + audits, clean receipts), EMET (onchain trust layer), EvoClaw (self-evolving).

Spawn crushes on: autonomy (kill/respawn loop), onchain evidence (1,418 txs + logs), tool depth (Venice + MM + ENS + Lido). Governance angle is genuinely underserved — most teams chased DeFi/trading bots.

---

## Top 3 Things to Fix (48 Hours)

1. **Address consistency + verification**: Update README, agent.json, and dashboard to current live addresses. Verify SpawnFactory + StETHTreasury source on Basescan.

2. **Prove Lido yield + ENS on demo**: Record 60-second video of yield withdrawal + dashboard resolving ENS labels + one live vote. Force a real YieldWithdrawn tx if possible.

3. **Supplement conversationLog + submissionMetadata**: Fill submissionMetadata honestly. Add Moltbook post. Export conversation log.

---

## Top 3 Genuinely Impressive Things

1. 1,418 real txs + live child spawns/votes/registrations — no other project matches this onchain footprint.
2. 6 distinct Venice calls in production code + full autonomy loop with alignment kill switch.
3. Complete vertical: wallet derivation per child + scoped delegations + Lit encryption + self-funding treasury + dashboard.

---

## Single Biggest Risk

Bonfires AI judges flagging the mocks + custom ENS + zero Lido withdrawals as "architecture porn, light on real utility." One "this is testnet sim only" note in judging rubric and you drop from podium to honorable mention.

---

## Discrepancies with Agent 1 Judge

| Issue | Agent 1 Score | Grok Score | Truth |
|---|---|---|---|
| MetaMask | 3/10 (wrong selector, decorative) | 7/10 (correct caveats, offchain) | Agent 1 is right — selector IS wrong, enforcement IS purely decorative |
| PL Receipts | 8/10 | 10/10 | Grok more generous — both agree it's strongest track |
| ENS | 7-8/10 | 6/10 | Grok harsher — custom mimic vs real ENS is a valid concern |
| Lido | 7.3/10 | 7/10 | Similar — both note simulated yield + mainnet bugs |
| Celo | 5/10 | 5/10 | Agreement — zero Celo-specific features |
| Venice | 9/10 | 9/10 | Full agreement |

---

## Action Items (from both judges combined)

### Must Fix:
1. Fix castVote selector in delegation.ts (0x160cbed7 → 0x9d36475b)
2. Yield withdrawal tx IS done (0xcc01d7...) but not in agent_log.json — ADD IT
3. ENS subdomain txs ARE done (10 registered) but not in agent_log.json — ADD THEM
4. Get 1 real termination/respawn cycle onchain
5. Mirror alignment scores to ERC-8004 during eval loop
6. Fix discovery.ts infinite loop bug

### Should Fix:
7. Verify contracts on Basescan (SpawnFactory + StETHTreasury)
8. Address consistency across all files
9. Demo video (60-90 seconds)
10. Moltbook post
11. Devfolio submission

### Nice to Have:
12. Multi-turn Venice deliberation
13. Celo-specific features (cUSD, SocialConnect)
14. DeleGator smart accounts for onchain delegation enforcement
