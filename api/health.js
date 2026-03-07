const LicenseDB = require('../license-db');
const db = new LicenseDB();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const allKeys = await db.getAllKeys();
  res.status(200).json({
    status: "ok",
    db: {
      keyCount: allKeys.length,
      provider: db.isUsingSupabase ? 'supabase' : 'json'
    }
  });
};