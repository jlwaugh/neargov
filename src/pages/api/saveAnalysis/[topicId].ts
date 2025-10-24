import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { buildScreeningPrompt } from "@/lib/screeningPrompt";
import { screeningResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Evaluation } from "@/types/evaluation";

/**
 * POST /api/saveAnalysis/[topicId]
 *
 * Screens a proposal and saves the result (pass or fail) to the database.
 * Used for:
 * 1. Saving screening after publishing to Discourse (from PublishButton)
 * 2. Retroactive evaluation of existing proposals (from ScreenProposalButton)
 *
 * Security:
 * - Requires NEP-413 auth token
 * - Re-screens content server-side (doesn't trust client evaluation)
 * - Prevents duplicate screenings per topicId (via primary key + error handling)
 * - Always saves results for transparency (pass or fail)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract topicId from URL parameter
  const topicIdParam = req.query.topicId;
  const topicId = Array.isArray(topicIdParam) ? topicIdParam[0] : topicIdParam;

  const { title, content, evaluatorAccount } = req.body as {
    title?: string;
    content?: string;
    evaluatorAccount?: string; // Optional - if provided, must match signer
    authToken?: string; // Optional fallback if not using Authorization header
  };

  // Validate required inputs
  if (!topicId || typeof topicId !== "string") {
    return res.status(400).json({ error: "Invalid topic ID" });
  }
  if (!title?.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!content?.trim()) {
    return res.status(400).json({ error: "Content is required" });
  }

  // Content length limits
  const MAX_TITLE_LENGTH = 500;
  const MAX_CONTENT_LENGTH = 10000; // ~10KB

  if (title.length > MAX_TITLE_LENGTH) {
    return res.status(400).json({
      error: `Title too long (max ${MAX_TITLE_LENGTH} characters)`,
    });
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({
      error: `Content too long (max ${MAX_CONTENT_LENGTH} characters)`,
    });
  }

  // Basic input sanitization
  const sanitize = (text: string) => {
    // Remove control characters
    return text.replace(/[\x00-\x1F\x7F]/g, "");
  };

  const sanitizedTitle = sanitize(title.trim());
  const sanitizedContent = sanitize(content.trim());

  // Extract NEP-413 auth token from Authorization header or body
  const authHeader = req.headers.authorization;
  const authToken =
    (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined) ||
    (typeof (req.body as any).authToken === "string"
      ? (req.body as any).authToken
      : undefined);

  if (!authToken) {
    return res.status(401).json({
      error: "Missing auth token",
      message: "Send NEP-413 authToken in Authorization: Bearer <token>",
    });
  }

  try {
    // Verify NEP-413 token
    const { verify } = await import("near-sign-verify");

    const result = await verify(authToken, {
      expectedRecipient: "social.near",
      nonceMaxAge: 5 * 60 * 1000, // 5 minutes
    });

    const signerAccountId = result.accountId;

    // If evaluatorAccount provided, ensure it matches the signer
    if (
      evaluatorAccount?.trim() &&
      evaluatorAccount.trim() !== signerAccountId
    ) {
      return res.status(401).json({
        error: "Account mismatch",
        message: "evaluatorAccount does not match the signed token's account",
      });
    }

    // Check for existing screening (optimization to avoid AI call if already exists)
    const existing = await db
      .select()
      .from(screeningResults)
      .where(eq(screeningResults.topicId, topicId))
      .limit(1);

    if (existing?.length) {
      return res.status(409).json({
        error: "Already evaluated",
        message: "This proposal has already been evaluated",
      });
    }

    // Get AI API key
    const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI API not configured" });
    }

    // Build screening prompt using reusable utility
    const prompt = buildScreeningPrompt(sanitizedTitle, sanitizedContent);

    // Call AI for screening evaluation
    const evaluateResponse = await fetch(
      "https://cloud-api.near.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      }
    );

    if (!evaluateResponse.ok) {
      throw new Error(`AI evaluation failed: ${evaluateResponse.status}`);
    }

    const data = await evaluateResponse.json();
    const aiContent: string = data.choices[0]?.message?.content ?? "";

    // Extract JSON from AI response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }

    const evaluation: Evaluation = JSON.parse(jsonMatch[0]);

    // Validate evaluation structure
    if (evaluation.overallPass === undefined) {
      throw new Error("Invalid evaluation structure");
    }

    // Save to database (regardless of pass/fail for transparency)
    try {
      await db.insert(screeningResults).values({
        topicId,
        evaluation,
        title: sanitizedTitle,
        nearAccount: signerAccountId,
      });
    } catch (dbError: any) {
      // Handle duplicate key error (primary key violation)
      // Error code 23505 = PostgreSQL unique_violation
      if (
        dbError.code === "23505" ||
        dbError.constraint === "screening_results_pkey"
      ) {
        return res.status(409).json({
          error: "Already evaluated",
          message: "This proposal has already been evaluated",
        });
      }
      // Re-throw other database errors
      throw dbError;
    }

    return res.status(200).json({
      success: true,
      saved: true,
      passed: evaluation.overallPass,
      evaluation,
      message: evaluation.overallPass
        ? "Evaluation passed and saved"
        : "Evaluation failed but saved",
    });
  } catch (error: any) {
    console.error("Evaluation error:", error);
    return res.status(500).json({
      error: "Evaluation failed",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
