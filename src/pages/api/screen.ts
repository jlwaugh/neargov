import { NextApiRequest, NextApiResponse } from "next";

interface EvaluationCriterion {
  pass: boolean;
  reason: string;
}

interface Alignment {
  score: "high" | "medium" | "low";
  reason: string;
}

interface Evaluation {
  complete: EvaluationCriterion;
  legible: EvaluationCriterion;
  consistent: EvaluationCriterion;
  genuine: EvaluationCriterion;
  compliant: EvaluationCriterion;
  logicallyJustified: EvaluationCriterion;
  alignment: Alignment;
  overallPass: boolean;
  summary: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, proposal } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Proposal title is required" });
  }

  if (!proposal || !proposal.trim()) {
    return res.status(400).json({ error: "Proposal text is required" });
  }

  const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const prompt = `You are evaluating a NEAR ecosystem proposal against specific criteria. Analyze the following proposal and provide a structured assessment.

Proposal Title: ${title}

Proposal:
${proposal}

Evaluate against these criteria and respond in JSON format:
{
  "complete": {"pass": boolean, "reason": "brief explanation"},
  "legible": {"pass": boolean, "reason": "brief explanation"},
  "consistent": {"pass": boolean, "reason": "brief explanation"},
  "genuine": {"pass": boolean, "reason": "brief explanation"},
  "compliant": {"pass": boolean, "reason": "brief explanation"},
  "logicallyJustified": {"pass": boolean, "reason": "brief explanation"},
  "alignment": {"score": "high/medium/low", "reason": "brief explanation of alignment with NEAR's mission"},
  "overallPass": boolean,
  "summary": "2-3 sentence summary of the evaluation"
}

Be objective and constructive. Focus on whether the proposal meets minimum quality standards.`;

  try {
    const response = await fetch(
      "https://cloud-api.near.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-oss-120b",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`NEAR AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const evaluation: Evaluation = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ evaluation });
    } else {
      throw new Error("Could not parse evaluation response");
    }
  } catch (error: any) {
    console.error("Evaluation error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to evaluate proposal" });
  }
}
