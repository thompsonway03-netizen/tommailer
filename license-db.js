const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// keeps the same behaviour as the previous inline LicenseDB class
class LicenseDB {
  constructor() {
    this.keys = new Map();
    this.load();
  }

  load() {
    try {
      const primaryFile = this.dbFile;
      const fallbackFile = path.join(__dirname, 'licensing.json');

      let data = null;
      if (fs.existsSync(primaryFile)) {
        console.log(`Loading license DB from primary: ${primaryFile}`);
        data = fs.readFileSync(primaryFile, 'utf-8');
      } else if (fs.existsSync(fallbackFile)) {
        console.log(`Seeding license DB from fallback: ${fallbackFile}`);
        data = fs.readFileSync(fallbackFile, 'utf-8');
        // If we are on Vercel, we should write this to /tmp so we can update it
        if (process.env.VERCEL) {
          try {
            fs.writeFileSync(primaryFile, data);
            console.log(`Successfully seeded ${primaryFile}`);
          } catch (err) {
            console.error(`Failed to write seed file to ${primaryFile}:`, err);
          }
        }
      }

      if (data) {
        const keysArray = JSON.parse(data);
        keysArray.forEach(k => {
          this.keys.set(k.serial_key, k);
        });
      } else {
        this.initializeDefaultKeys();
      }
    } catch (e) {
      console.error('Error loading license DB:', e);
      this.initializeDefaultKeys();
    }
  }

  get dbFile() {
    // Vercel has a read-only filesystem except for /tmp
    if (process.env.VERCEL) {
      return path.join('/tmp', 'licensing.json');
    }
    // allow overriding via environment if desired
    return process.env.LICENSE_DB_FILE || 'licensing.json';
  }

  initializeDefaultKeys() {
    const defaultKeys = [
      '7B725183DD',
      'E7F6F9814B',
      '7542CDABAC',
      '9BB814FCA7',
      'C759988074',
      '40782DFCF7',
      '0C4279F6E8',
      '7EF94B124E',
      '618025C9AE',
      '703941A4DF'
    ];

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
      fs.writeFileSync(this.dbFile, JSON.stringify(keysArray, null, 2));
    } catch (e) {
      console.error('Error saving license DB:', e);
    }
  }

  getKey(serialKey) {
    return this.keys.get(serialKey);
  }

  updateKey(serialKey, is_active, hwid) {
    let key = this.keys.get(serialKey);
    if (!key) {
      // If it's a new key being registered (e.g. from generate)
      key = {
        serial_key: serialKey,
        is_active: is_active,
        hwid_locked_to: hwid
      };
      this.keys.set(serialKey, key);
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
