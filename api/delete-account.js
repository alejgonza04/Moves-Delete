import { Clerk } from "@clerk/clerk-sdk-node";
import admin from "firebase-admin";

// clerk
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("Missing CLERK_SECRET_KEY");
}
const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

//firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}
const db = admin.firestore();

// handler
export default async function handler(req, res) {
  // only POST allowed
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({ error: "Method Not Allowed", allow: ["POST"] });
  }

  const { userId } = req.body;
  if (!userId) {
    return res
      .status(400)
      .json({ error: "Missing userId" });
  }

  try {
    // delete Clerk user (also revokes sessions)
    await clerk.users.deleteUser(userId);

    //delete Firestore document at users/{userId}
    await db.collection("users").doc(userId).delete();

    // (if you have subcollections, delete those here as needed.)

    return res
      .status(200)
      .json({ success: true });
  } catch (err) {
    console.error("delete-account error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal Error" });
  }
}
