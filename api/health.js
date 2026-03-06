const LicenseDB = require('../license-db');
const db = new LicenseDB();

module.exports = async (req, res) => {
  const allKeys = await db.getAllKeys();
  res.status(200).json({
    status: "ok",
    db: {
      keyCount: allKeys.length,
      provider: db.isUsingSupabase ? 'supabase' : 'json'
    }
  });
};