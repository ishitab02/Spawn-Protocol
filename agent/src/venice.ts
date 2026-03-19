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
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Venice");

  const parsed = JSON.parse(content);
  return {
    decision: parsed.decision as "FOR" | "AGAINST" | "ABSTAIN",
    reasoning: parsed.reasoning as string,
  };
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
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Venice");

  const parsed = JSON.parse(content);
  return parsed.score as number;
}

export { venice };
