import { Clerk } from "@clerk/clerk-sdk-node";
import admin from "firebase-admin";

// initialize Clerk
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("Missing CLERK_SECRET_KEY");
}
const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

// initialize Firebase Admin once per cold start
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // replace literal "\n" with actual newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}
const db = admin.firestore();

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
    // delete Clerk user (revokes sessions automatically)
    await clerk.users.deleteUser(userId);

    // delete Firestore “users/{userId}” document
    await db.collection("users").doc(userId).delete();

    // if you have subcollections, you must delete those separately.

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("delete-account error:", err);
    return res.status(500).json({ error: err.message || "Internal Error" });
  }
}
