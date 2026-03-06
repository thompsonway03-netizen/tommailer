import express from "express";
import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Simple file-based licensing (no native dependencies)
const dbFile = "licensing.json";

interface LicenseKey {
  serial_key: string;
  is_active: boolean;
  hwid_locked_to: string | null;
}

class LicenseDB {
  private keys: Map<string, LicenseKey> = new Map();

  constructor() {
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(dbFile)) {
        const data = fs.readFileSync(dbFile, "utf-8");
        const keysArray = JSON.parse(data);
        keysArray.forEach((k: LicenseKey) => {
          this.keys.set(k.serial_key, k);
        });
      } else {
        // Initialize from licensing.json or create default keys
        this.initializeDefaultKeys();
      }
    } catch (e) {
      console.error("Error loading license DB:", e);
      this.initializeDefaultKeys();
    }
  }

  private initializeDefaultKeys() {
    // Default keys for testing
    const defaultKeys = [];

    defaultKeys.forEach(key => {
      if (!this.keys.has(key)) {
        this.keys.set(key, {
          serial_key: key,
          is_active: false,
          hwid_locked_to: null
        });
      }
    });
    this.save();
  }

  save() {
    try {
      const keysArray = Array.from(this.keys.values());
      fs.writeFileSync(dbFile, JSON.stringify(keysArray, null, 2));
    } catch (e) {
      console.error("Error saving license DB:", e);
    }
  }

  getKey(serialKey: string) {
    return this.keys.get(serialKey);
  }

  updateKey(serialKey: string, is_active: boolean, hwid: string | null) {
    const key = this.keys.get(serialKey);
    if (key) {
      key.is_active = is_active;
      key.hwid_locked_to = hwid;
      this.save();
    }
  }

  getAllKeys() {
    return Array.from(this.keys.values());
  }

  generateKey() {
    return crypto.randomBytes(5).toString("hex").toUpperCase();
  }
}

const licenseDB = new LicenseDB();
const app = express();
app.use(express.json());

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

  // Activate
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
  const { senders, recipients, subject, body } = req.body;

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

    // Verify connection
    await transporter.verify();

    // Send mail
    await transporter.sendMail({
      from: sender.user,
      to: recipient,
      subject: subject,
      text: body,
    });

    return res.json({ status: "success", message: `Email sent to ${recipient}` });
  } catch (error: any) {
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
  for (let i = 0; i < 10; i++) {
    const newKey = licenseDB.generateKey();
    licenseDB.updateKey(newKey, false, null);
  }
  res.json({ message: "10 new keys generated" });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Licensing server running on http://localhost:${PORT}`);
});
