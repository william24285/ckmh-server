import express from "express";
import { WebSocketServer } from "ws";
import admin from "firebase-admin";
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

// Initialize Firebase Admin
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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

// Sample endpoint
app.get("/", (req, res) => {
  res.send("CKMH WebSocket Server is running 🚀");
});

// Start HTTP server
const server = app.listen(port, () => {
  console.log(`✅ HTTP server running on port ${port}`);
});

// Start WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("🟢 New client connected");

  // Example: send a message when a member is added
  const sendMemberAdded = (fullname) => {
    ws.send(`👤 New member joined: ${fullname}`);
  };

  // For testing: send dummy data every 10s
  setInterval(() => {
    sendMemberAdded("Test Member " + Math.floor(Math.random() * 1000));
  }, 10000);

  ws.on("close", () => {
    console.log("🔴 Client disconnected");
  });
});
