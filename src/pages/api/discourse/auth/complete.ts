import type { NextApiRequest, NextApiResponse } from "next";
import { getDiscourseClient } from "@/lib/discoursePlugin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { payload, nonce, authToken } = req.body;

    const client = await getDiscourseClient();
    const result = await client.completeLink({
      payload,
      nonce,
      authToken,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error completing link:", error);
    res.status(500).json({
      error: error.message || "Failed to complete link",
    });
  }
}
