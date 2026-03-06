const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// pull LicenseDB from its own module so other utilities can use it
const LicenseDB = require("./license-db");
const licenseDB = new LicenseDB();
const app = express();
app.use(express.json());

// allow cross-origin requests (file:// origin or remote machines)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Licensing Endpoints
app.post("/api/activate", (req, res) => {
  const { key, hwid } = req.body;
  if (!key || !hwid) return res.status(400).json({ message: "Missing key or hwid" });

  const row = licenseDB.getKey(key);

  if (!row) {
    return res.json({ status: "Invalid Key" });
  }

  if (row.is_active) {
    if (row.hwid_locked_to === hwid) {
      return res.json({ status: "Success" });
    } else {
      return res.json({ status: "Serial already in use" });
    }
  }

  licenseDB.updateKey(key, true, hwid);
  return res.json({ status: "Success" });
});

app.post("/api/deactivate", (req, res) => {
  const { key, hwid } = req.body;
  const row = licenseDB.getKey(key);

  if (row && row.hwid_locked_to === hwid) {
    licenseDB.updateKey(key, false, null);
    return res.json({ status: "Success" });
  }
  return res.json({ status: "Invalid" });
});

// Email Automation Logic
app.post("/api/send-emails", async (req, res) => {
  const { senders, recipients, subject, body, replyTo } = req.body;

  if (!senders || !recipients || !subject || !body) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const sender = senders[0];
  const recipient = recipients[0];

  try {
    const transporter = nodemailer.createTransport({
      host: sender.host,
      port: parseInt(sender.port),
      secure: sender.port === "465",
      auth: {
        user: sender.user,
        pass: sender.pass,
      },
    });

    await transporter.verify();

    const mailOptions = {
      from: sender.user,
      to: recipient,
      subject: subject,
      text: body,
    };
    if (replyTo) mailOptions.replyTo = replyTo;
    await transporter.sendMail(mailOptions);

    return res.json({ status: "success", message: `Email sent to ${recipient}` });
  } catch (error) {
    console.error(`[SMTP ERROR] ${error.message}`);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// Admin: List all keys
app.get("/api/admin/keys", (req, res) => {
  res.json(licenseDB.getAllKeys());
});

// Admin: Generate more keys
app.post("/api/admin/generate", (req, res) => {
  const created = [];
  for (let i = 0; i < 10; i++) {
    const newKey = licenseDB.generateKey();
    licenseDB.updateKey(newKey, false, null);
    created.push(newKey);
  }
  res.json({ message: "10 new keys generated", keys: created });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

function startServer() {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Licensing server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[WARN] Port ${PORT} is already in use. Server might already be running.`);
    } else {
      console.error("[ERROR] Server error:", err);
    }
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
