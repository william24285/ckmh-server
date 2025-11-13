import express from "express";
import admin from "firebase-admin";

const app = express();
app.use(express.json());

// ✅ Validate environment variables
const requiredVars = [
  "FIREBASE_TYPE",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_CLIENT_ID",
  "FIREBASE_AUTH_URI",
  "FIREBASE_TOKEN_URI",
  "FIREBASE_AUTH_CERT_URL",
  "FIREBASE_CLIENT_CERT_URL"
];

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Environment variable ${key} is not set!`);
    process.exit(1);
  }
});

// ✅ Initialize Firebase Admin using safe method
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🔔 Helper function to send notification and record it
async function sendAndSaveNotification(title, body, tokens) {
  if (!tokens || tokens.length === 0) return;

  const message = {
    notification: { title, body },
    tokens: tokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // Save to Firestore
  await db.collection("notifications").add({
    title,
    body,
    sentTo: tokens.length,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ ${response.successCount} notifications sent: ${title}`);
}

// 🔁 Automatic trigger route
app.post("/trigger", async (req, res) => {
  try {
    const { eventType, data } = req.body;
    const groupName = "CKMH Millionaire Club";

    // Get all tokens
    const membersSnapshot = await db.collection("members").get();
    const tokens = membersSnapshot.docs
      .map((doc) => doc.data().fcmToken)
      .filter((t) => t);

    let title = "";
    let body = "";

    switch (eventType) {
      case "member_joined":
        title = "Member Mpya!";
        body = `${data.name} amejiunga kwenye kikundi chetu cha ${groupName}.`;
        break;

      case "member_updated":
        title = "Taarifa Mpya za Mwanakikundi";
        body = `${data.name} amesasisha taarifa zake (${data.updatedField}).`;
        break;

      case "loan_requested":
        title = "Ombi Jipya la Mkopo";
        body = `${data.name} ameomba mkopo wa TZS ${data.amount}.`;
        break;

      case "group_stats_changed":
        title = "Taarifa za Kikundi Zimebadilika";
        body = `Salio la kikundi ${groupName} limefikia TZS ${data.groupBalance}.`;
        break;

      case "message_sent":
        title = `Ujumbe Mpya kutoka ${data.senderName}`;
        body = data.text;
        break;

      default:
        return res
          .status(400)
          .json({ success: false, message: "Unknown event type" });
    }

    await sendAndSaveNotification(title, body, tokens);
    res.status(200).json({ success: true, message: "Notification sent" });
  } catch (error) {
    console.error("❌ Trigger error:", error);
    res.status(500).json({ success: false, error });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Notification server running on port ${PORT}`)
);
