const LicenseDB = require('../license-db');
const db = new LicenseDB();

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  let { key, hwid } = req.body;
  if (!key) return res.status(400).json({ status: 'Invalid' });
  key = key.trim().toUpperCase();
  const row = await db.getKey(key);

  if (row && row.hwid_locked_to === hwid) {
    await db.updateKey(key, false, null);
    return res.json({ status: 'Success' });
  }
  return res.json({ status: 'Invalid' });
};
