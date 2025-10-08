const express = require("express");
const WebSocket = require("ws");
const admin = require("firebase-admin");
const http = require("http");

// Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Express app + HTTP server
const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });
let clients = [];

wss.on("connection", (ws) => {
  console.log("📡 New client connected");
  clients.push(ws);

  ws.on("close", () => {
    console.log("❌ Client disconnected");
    clients = clients.filter((c) => c !== ws);
  });
});

// Listen to Firestore changes (example: “members” collection)
db.collection("members").onSnapshot((snapshot) => {
  snapshot.docChanges().forEach((change) => {
    const data = change.doc.data();
    let message = null;

   if (change.type === "added") {
  message = `👤 New member joined: ${data.fullName || 'Unknown'}`;
} else if (change.type === "modified") {
  message = `✏️ Member updated: ${data.fullName || 'Unknown'}`;
} else if (change.type === "removed") {
  message = `🗑️ Member removed: ${data.fullName || 'Unknown'}`;
}

    if (message) {
      console.log("📨 Sending to clients:", message);
      clients.forEach((ws) => ws.send(message));
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 WebSocket Server running on port ${PORT}`));
