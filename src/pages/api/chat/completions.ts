import type { NextApiRequest, NextApiResponse } from "next";

/**
 * POST /api/chat/completions
 *
 * Server-side proxy for NEAR AI Cloud API to avoid CORS issues.
 * This endpoint forwards requests from the browser to NEAR AI Cloud.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "API key not configured on server",
      message: "Please add NEAR_AI_CLOUD_API_KEY to your .env file",
    });
  }

  const { model, messages, stream } = req.body;

  // Validate request
  if (!model || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

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
          model,
          messages,
          stream: stream || false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NEAR AI API error:", response.status, errorText);
      return res.status(response.status).json({
        error: `API Error: ${response.status}`,
        details: errorText,
      });
    }

    // If streaming, pipe the response
    if (stream && response.body) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          res.write(chunk);
        }
      } finally {
        res.end();
      }
    } else {
      // Non-streaming response
      const data = await response.json();
      res.status(200).json(data);
    }
  } catch (error: any) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error: "Failed to proxy request",
      message: error.message,
    });
  }
}
