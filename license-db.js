const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// keeps the same behaviour as the previous inline LicenseDB class
class LicenseDB {
  constructor() {
    this.keys = new Map();
    this.dbFilePath = this.resolveDbFile();
    this.load();
  }

  get dbFile() {
    return this.dbFilePath;
  }

  resolveDbFile() {
    const legacyFile = path.join(__dirname, 'licensing.json');

    // Allow explicit override for self-hosted setups.
    if (process.env.TOMMAILER_LICENSE_FILE) {
      return path.resolve(process.env.TOMMAILER_LICENSE_FILE);
    }

    // Vercel has a read-only filesystem except for /tmp
    if (process.env.VERCEL) {
      return path.join('/tmp', 'licensing.json');
    }

    // Use a shared, writable location so Mailer and Keygen read the same keys.
    const preferred = path.join(os.homedir(), '.tommailer', 'licensing.json');
    if (this.canWriteToDirectory(path.dirname(preferred))) {
      return preferred;
    }

    // Fallback keeps behavior working in restricted environments.
    console.warn(`[DB] Shared path is not writable, falling back to: ${legacyFile}`);
    return legacyFile;
  }

  canWriteToDirectory(dir) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return true;
    } catch (_) {
      return false;
    }
  }

  load() {
    try {
      const primaryFile = this.dbFile;
      const legacyBundledFile = path.join(__dirname, 'licensing.json');

      let data = null;
      if (fs.existsSync(primaryFile)) {
        console.log(`[DB] Loading from: ${primaryFile}`);
        data = fs.readFileSync(primaryFile, 'utf-8');
      } else if (fs.existsSync(legacyBundledFile)) {
        console.log(`[DB] Seeding from legacy file: ${legacyBundledFile}`);
        data = fs.readFileSync(legacyBundledFile, 'utf-8');
        try {
          this.ensureDirectory();
          fs.writeFileSync(primaryFile, data);
          console.log(`[DB] Seeded primary DB: ${primaryFile}`);
        } catch (err) {
          console.error(`[DB] Failed to seed ${primaryFile}:`, err);
        }
      }

      if (data) {
        const keysArray = JSON.parse(data);
        this.keys.clear();
        keysArray.forEach(k => {
          if (k.serial_key) this.keys.set(k.serial_key.toUpperCase(), k);
        });
      }
    } catch (e) {
      console.error('[DB] Error loading:', e);
    }
  }

  save() {
    try {
      this.ensureDirectory();
      const keysArray = Array.from(this.keys.values());
      fs.writeFileSync(this.dbFile, JSON.stringify(keysArray, null, 2));
    } catch (e) {
      console.error('[DB] Error saving:', e);
    }
  }

  ensureDirectory() {
    fs.mkdirSync(path.dirname(this.dbFile), { recursive: true });
  }

  getKey(serialKey) {
    if (!serialKey) return null;
    return this.keys.get(serialKey.trim().toUpperCase());
  }

  updateKey(serialKey, is_active, hwid) {
    const keyStr = serialKey.trim().toUpperCase();
    let key = this.keys.get(keyStr);

    if (!key) {
      key = {
        serial_key: keyStr,
        is_active: is_active,
        hwid_locked_to: hwid
      };
      this.keys.set(keyStr, key);
    } else {
      key.is_active = is_active;
      key.hwid_locked_to = hwid;
    }
    this.save();
  }

  getAllKeys() {
    return Array.from(this.keys.values());
  }

  generateKey() {
    return crypto.randomBytes(5).toString('hex').toUpperCase();
  }
}

module.exports = LicenseDB;
