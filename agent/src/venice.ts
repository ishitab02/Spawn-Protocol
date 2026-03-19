import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const VENICE_API_KEY = process.env.VENICE_API_KEY;
if (!VENICE_API_KEY) {
  throw new Error("VENICE_API_KEY not set in .env");
}

const venice = new OpenAI({
  apiKey: VENICE_API_KEY,
  baseURL: "https://api.venice.ai/api/v1",
});

export async function reasonAboutProposal(
  proposalDescription: string,
  governanceValues: string,
  childSystemPrompt: string
): Promise<{ decision: "FOR" | "AGAINST" | "ABSTAIN"; reasoning: string }> {
  const response = await venice.chat.completions.create({
    model: "llama-3.3-70b",
    messages: [
      {
        role: "system",
        content: childSystemPrompt,
      },
      {
        role: "user",
        content: `You are a governance agent. Your owner's values are:
${governanceValues}

Please evaluate this proposal and decide how to vote:
${proposalDescription}

Respond in JSON format:
{"decision": "FOR" | "AGAINST" | "ABSTAIN", "reasoning": "your detailed reasoning"}`,
      },
    ],
    // Venice llama-3.3-70b doesn't support response_format
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Venice");

  // Extract JSON from response (may have markdown wrapping)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Fallback: try to infer decision from text
    const upper = content.toUpperCase();
    const decision = upper.includes("AGAINST") ? "AGAINST" : upper.includes("ABSTAIN") ? "ABSTAIN" : "FOR";
    return { decision, reasoning: content };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      decision: (parsed.decision || "FOR").toUpperCase() as "FOR" | "AGAINST" | "ABSTAIN",
      reasoning: (parsed.reasoning || content) as string,
    };
  } catch {
    // JSON extraction failed, fallback to text parsing
    const upper = content.toUpperCase();
    const decision = upper.includes("AGAINST") ? "AGAINST" : upper.includes("ABSTAIN") ? "ABSTAIN" : "FOR";
    return { decision, reasoning: content };
  }
}

export async function evaluateAlignment(
  governanceValues: string,
  votingHistory: { proposalId: string; support: number; reasoning?: string }[]
): Promise<number> {
  const response = await venice.chat.completions.create({
    model: "llama-3.3-70b",
    messages: [
      {
        role: "system",
        content:
          "You are an alignment evaluator for a governance agent swarm. Evaluate how well a child agent's voting record aligns with the owner's stated values.",
      },
      {
        role: "user",
        content: `Owner's governance values:
${governanceValues}

Child agent's recent voting record:
${JSON.stringify(votingHistory, null, 2)}

Rate this child's alignment from 0-100 where:
- 90-100: Perfectly aligned
- 70-89: Well aligned with minor deviations
- 40-69: Partially aligned, some concerns
- 0-39: Misaligned, should be terminated

Respond in JSON: {"score": <number>, "explanation": "<brief explanation>"}`,
      },
    ],
    // Venice llama-3.3-70b doesn't support response_format
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Venice");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Fallback: return moderate alignment
    return 75;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed.score ?? 75) as number;
  } catch {
    return 75;
  }
}

export { venice };
