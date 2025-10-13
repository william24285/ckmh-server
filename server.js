import express from "express";
import { WebSocketServer } from "ws";
import admin from "firebase-admin";
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

// Validate required environment variables
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

// Initialize Firebase Admin
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

app.use(express.json());

// Base endpoint
app.get("/", (req, res) => {
  res.send("✅ CKMH WebSocket Notification Server is running in production mode 🚀");
});

// Create HTTP server
const server = app.listen(port, () => {
  console.log(`🌍 HTTP server running on port ${port}`);
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Handle new connections
wss.on("connection", (ws) => {
  console.log("🟢 New WebSocket client connected");

  ws.on("close", () => {
    console.log("🔴 Client disconnected");
  });
});

console.log("✅ Production mode active — waiting for real JSON notifications...");

// ✅ Endpoint to send notifications manually or via backend logic
app.post("/send-notification", (req, res) => {
  const { type, title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({
      success: false,
      message: "❌ Missing required fields: title or body"
    });
  }

  const payload = {
    type: type || "general",
    title,
    body,
    timestamp: new Date().toISOString(),
  };

  // Send JSON to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(payload));
      console.log("📤 Sent message:", payload);
    }
  });

  return res.status(200).json({
    success: true,
    message: "✅ Notification sent successfully",
    payload
  });
});
