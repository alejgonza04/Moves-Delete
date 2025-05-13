import { Clerk } from "@clerk/clerk-sdk-node";
import type { VercelRequest, VercelResponse } from "@vercel/node";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("Missing CLERK_SECRET_KEY env var");
}

const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { userId } = req.body as { userId?: string };
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    // revoke all sessions first (optional but recommended)
    await clerk.sessions.revokeAll({ userId });
    // permanently delete the user
    await clerk.users.deleteUser(userId);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("delete-account error:", err);
    return res.status(500).json({ error: err.message || "Internal Error" });
  }
}
