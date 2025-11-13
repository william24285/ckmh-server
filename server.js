import express from "express";
import admin from "firebase-admin";

const app = express();
app.use(express.json());

// ✅ Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
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
