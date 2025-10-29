import { NextApiRequest, NextApiResponse } from "next";
import type { Evaluation } from "@/types/evaluation";
import { buildScreeningPrompt } from "@/lib/screeningPrompt";

/**
 * POST /api/screen
 *
 * Public preview screening endpoint - evaluates proposals WITHOUT saving.
 * Used on the main page to preview screening results before publishing.
 *
 * No authentication required.
 * Does NOT save results to database.
 * Rate limited to prevent abuse.
 *
 * Usage:
 * - Main page: User screens proposal before deciding to publish
 * - Preview only: Results are not persisted
 * - PublishButton: Only shown if this endpoint returns overallPass: true
 *
 * Returns:
 * - 200: Evaluation completed successfully
 * - 400: Missing or invalid input
 * - 405: Method not allowed (non-POST requests)
 * - 429: Too many requests (rate limit exceeded)
 * - 500: AI API error or evaluation failed
 */

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per window

function getRateLimitKey(req: NextApiRequest): string {
  // Use IP address as rate limit key
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded.split(",")[0]
    : req.socket.remoteAddress || "unknown";
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // No record or expired window - allow and create new record
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true };
  }

  // Within window - check count
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  return { allowed: true };
}

// Cleanup old entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check rate limit
  const rateLimitKey = getRateLimitKey(req);
  const { allowed, resetTime } = checkRateLimit(rateLimitKey);

  if (!allowed) {
    const retryAfter = resetTime
      ? Math.ceil((resetTime - Date.now()) / 1000)
      : 60;
    res.setHeader("Retry-After", retryAfter.toString());
    return res.status(429).json({
      error: "Too many requests",
      message: `Rate limit exceeded. Please try again in ${Math.ceil(
        retryAfter / 60
      )} minutes.`,
      retryAfter,
    });
  }

  const { title, proposal } = req.body;

  // Validate required inputs
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Proposal title is required" });
  }

  if (!proposal || !proposal.trim()) {
    return res.status(400).json({ error: "Proposal text is required" });
  }

  // Content length limits
  const MAX_TITLE_LENGTH = 500;
  const MAX_PROPOSAL_LENGTH = 20000;

  if (title.length > MAX_TITLE_LENGTH) {
    return res.status(400).json({
      error: `Title too long (max ${MAX_TITLE_LENGTH} characters)`,
    });
  }

  if (proposal.length > MAX_PROPOSAL_LENGTH) {
    return res.status(400).json({
      error: `Proposal too long (max ${MAX_PROPOSAL_LENGTH} characters)`,
    });
  }

  // Basic input sanitization
  const sanitize = (text: string) => {
    // Remove control characters
    return text.replace(/[\x00-\x1F\x7F]/g, "");
  };

  const sanitizedTitle = sanitize(title);
  const sanitizedProposal = sanitize(proposal);

  // Get AI API key
  const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;

  if (!apiKey) {
    console.error("NEAR_AI_CLOUD_API_KEY not configured");
    return res.status(500).json({ error: "AI API not configured" });
  }

  // Build screening prompt using reusable utility
  const prompt = buildScreeningPrompt(sanitizedTitle, sanitizedProposal);

  try {
    // Call NEAR AI for evaluation
    const response = await fetch(
      "https://cloud-api.near.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Qwen/Qwen3-30B-A3B-Instruct-2507",
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
      throw new Error(
        `NEAR AI API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    // Extract JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Could not parse evaluation response");
    }

    const evaluation: Evaluation = JSON.parse(jsonMatch[0]);

    // Validate evaluation structure
    if (evaluation.overallPass === undefined) {
      throw new Error("Invalid evaluation structure: missing overallPass");
    }

    return res.status(200).json({ evaluation });
  } catch (error: any) {
    console.error("Evaluation error:", error);
    return res.status(500).json({
      error: error.message || "Failed to evaluate proposal",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
