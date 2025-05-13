import { Clerk } from "@clerk/clerk-sdk-node";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("Missing CLERK_SECRET_KEY env var");
}

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    // deleteUser will also revoke all sessions under the hood
    await clerk.users.deleteUser(userId);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("delete-account error:", err);
    return res.status(500).json({ error: err.message || "Internal Error" });
  }
}
