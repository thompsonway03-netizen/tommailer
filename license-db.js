const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// keeps the same behaviour as the previous inline LicenseDB class
const { createClient } = require('@supabase/supabase-js');

class LicenseDB {
  constructor() {
    this.keys = new Map();
    this.dbFilePath = this.resolveDbFile();

    // Initialize Supabase if credentials exist
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.isUsingSupabase = !!(this.supabaseUrl && this.supabaseKey);

    if (this.isUsingSupabase) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
      console.log('[DB] Using Supabase (Postgres) persistence.');
      this.seedSupabase(); // Trigger background seed if empty
    } else {
      console.log(`[DB] Using JSON persistence: ${this.dbFilePath}`);
      this.load();
    }
  }

  async seedSupabase() {
    try {
      const { count, error } = await this.supabase
        .from('licenses')
        .select('*', { count: 'exact', head: true });

      if (!error && count === 0) {
        console.log('[DB] Supabase is empty, seeding from licensing.json...');
        const legacyBundledFile = path.join(__dirname, 'licensing.json');
        if (fs.existsSync(legacyBundledFile)) {
          const data = fs.readFileSync(legacyBundledFile, 'utf-8');
          const keysArray = JSON.parse(data);
          if (keysArray.length > 0) {
            const { error: insertError } = await this.supabase
              .from('licenses')
              .insert(keysArray.map(k => ({
                serial_key: k.serial_key.toUpperCase(),
                is_active: !!k.is_active,
                hwid_locked_to: k.hwid_locked_to || null
              })));
            if (insertError) console.error('[DB] Seeding Error:', insertError);
            else console.log(`[DB] Successfully seeded ${keysArray.length} keys to Supabase.`);
          }
        }
      }
    } catch (e) {
      console.error('[DB] Seed failed:', e);
    }
  }

  get dbFile() {
    return this.dbFilePath;
  }

  resolveDbFile() {
    const legacyFile = path.join(__dirname, 'licensing.json');
    if (process.env.TOMMAILER_LICENSE_FILE) return path.resolve(process.env.TOMMAILER_LICENSE_FILE);
    if (process.env.VERCEL) return path.join('/tmp', 'licensing.json');

    try {
      const preferred = path.join(os.homedir(), '.tommailer', 'licensing.json');
      fs.mkdirSync(path.dirname(preferred), { recursive: true });
      return preferred;
    } catch (_) {
      return legacyFile;
    }
  }

  load() {
    if (this.isUsingSupabase) return;
    try {
      if (fs.existsSync(this.dbFile)) {
        const data = fs.readFileSync(this.dbFile, 'utf-8');
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

  async save() {
    if (this.isUsingSupabase) return;
    try {
      fs.mkdirSync(path.dirname(this.dbFile), { recursive: true });
      const keysArray = Array.from(this.keys.values());
      fs.writeFileSync(this.dbFile, JSON.stringify(keysArray, null, 2));
    } catch (e) {
      console.error('[DB] Error saving:', e);
    }
  }

  async getKey(serialKey) {
    if (!serialKey) return null;
    const keyStr = serialKey.trim().toUpperCase();

    if (this.isUsingSupabase) {
      const { data, error } = await this.supabase
        .from('licenses')
        .select('*')
        .eq('serial_key', keyStr)
        .single();

      if (error && error.code !== 'PGRST116') console.error('[DB] Supabase Error:', error);
      return data;
    }

    return this.keys.get(keyStr);
  }

  async updateKey(serialKey, is_active, hwid) {
    const keyStr = serialKey.trim().toUpperCase();

    if (this.isUsingSupabase) {
      const { error } = await this.supabase
        .from('licenses')
        .upsert({
          serial_key: keyStr,
          is_active: is_active,
          hwid_locked_to: hwid
        }, { onConflict: 'serial_key' });

      if (error) console.error('[DB] Supabase Upsert Error:', error);
      return;
    }

    let key = this.keys.get(keyStr);
    if (!key) {
      key = { serial_key: keyStr, is_active, hwid_locked_to: hwid };
      this.keys.set(keyStr, key);
    } else {
      key.is_active = is_active;
      key.hwid_locked_to = hwid;
    }
    await this.save();
  }

  async getAllKeys() {
    if (this.isUsingSupabase) {
      const { data, error } = await this.supabase
        .from('licenses')
        .select('*');
      if (error) console.error('[DB] Supabase Error:', error);
      return data || [];
    }
    return Array.from(this.keys.values());
  }

  generateKey() {
    return crypto.randomBytes(5).toString('hex').toUpperCase();
  }
}

module.exports = LicenseDB;
