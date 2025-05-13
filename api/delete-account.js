import { Clerk } from "@clerk/clerk-sdk-node";
import admin from "firebase-admin";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res
        .status(405)
        .json({ error: "Method Not Allowed", allow: ["POST"] });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (!process.env.CLERK_SECRET_KEY) {
      return res
        .status(500)
        .json({ error: "Server misconfiguration: missing CLERK_SECRET_KEY" });
    }
    const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

    // init Firebase Admin once
    if (!admin.apps.length) {
      const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } =
        process.env;
      if (
        !FIREBASE_PROJECT_ID ||
        !FIREBASE_CLIENT_EMAIL ||
        !FIREBASE_PRIVATE_KEY
      ) {
        return res.status(500).json({
          error:
            "Server misconfiguration: missing one or more FIREBASE_* environment variables",
        });
      }
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }
    const db = admin.firestore();

    // delete the Clerk user 
    await clerk.users.deleteUser(userId);

    // delete all bookmarks subcollection docs
    const bookmarksRefs = await db
      .collection("users")
      .doc(userId)
      .collection("bookmarks")
      .listDocuments();
    await Promise.all(bookmarksRefs.map((docRef) => docRef.delete()));

    // delete all friends subcollection docs
    const friendsRefs = await db
      .collection("users")
      .doc(userId)
      .collection("friends")
      .listDocuments();
    await Promise.all(friendsRefs.map((docRef) => docRef.delete()));

    // delete the top-level user document
    await db.collection("users").doc(userId).delete();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("delete-account error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal Server Error" });
  }
}

