import { Clerk } from "@clerk/clerk-sdk-node";
import admin from "firebase-admin";

// We’ll only initialize Clerk & Admin *inside* the handler, after we know env is good.

export default async function handler(req, res) {
  // Ensure JSON output on any path
  try {
    // 1) Method check
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res
        .status(405)
        .json({ error: "Method Not Allowed", allow: ["POST"] });
    }

    // 2) Env var checks
    const {
      CLERK_SECRET_KEY,
      FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY,
    } = process.env;

    if (!CLERK_SECRET_KEY) {
      return res
        .status(500)
        .json({ error: "Server misconfiguration: missing CLERK_SECRET_KEY" });
    }
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      return res.status(500).json({
        error:
          "Server misconfiguration: missing one or more FIREBASE_* environment variables",
      });
    }

    // 3) Initialize Clerk
    const clerk = Clerk({ secretKey: CLERK_SECRET_KEY });

    // 4) Initialize Firebase Admin once
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }
    const db = admin.firestore();

    // 5) Validate body
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId in request body" });
    }

    // 6) Perform deletions
    await clerk.users.deleteUser(userId);
    await db.collection("users").doc(userId).delete();
    // (if you have subcollections, delete them here as well)

    // 7) Success
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("delete-account unexpected error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal Server Error" });
  }
}
