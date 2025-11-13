import express from "express";
import { WebSocketServer } from "ws";
import admin from "firebase-admin";
import bodyParser from "body-parser";
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

// ✅ Parse JSON body
app.use(bodyParser.json());

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

// ✅ Initialize Firebase Admin
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
  credential: admin.credential.cert(serviceAccount)
});

// ✅ Sample HTTP endpoint
app.get("/", (req, res) => {
  res.send("CKMH WebSocket Server is running 🚀");
});

// ✅ Endpoint to send notifications manually
app.post("/send-notification", (req, res) => {
  const { type, title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: "title and body are required" });
  }

  const message = {
    type: type || "general",
    title,
    body,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to all WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  });

  console.log("📤 Sent message:", message);
  return res.status(200).json({ status: "sent", message });
});

// ✅ Start HTTP server
const server = app.listen(port, () => {
  console.log(`🌍 HTTP server running on port ${port}`);
});

// ✅ WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("🟢 New WebSocket client connected");

  // ✅ Example: auto send new member every 10s for testing
  const interval = setInterval(() => {
    const newMemberName = "Test Member " + Math.floor(Math.random() * 1000);
    const message = {
      type: "member_added",
      title: "👤 New Member Joined",
      body: `A new member named ${newMemberName} has joined.`,
      timestamp: new Date().toISOString(),
    };

    ws.send(JSON.stringify(message));
    console.log("📤 Sent message:", message);
  }, 10000);

  ws.on("close", () => {
    console.log("🔴 Client disconnected");
    clearInterval(interval); // stop auto messages when client disconnects
  });
});
