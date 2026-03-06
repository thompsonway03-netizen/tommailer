const LicenseDB = require('../license-db');
const db = new LicenseDB();

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  let { key, hwid } = req.body;
  if (!key || !hwid) return res.status(400).json({ message: 'Missing key or hwid' });
  key = key.trim().toUpperCase();

  const row = await db.getKey(key);
  if (!row || key === '7B725183DD') return res.json({ status: 'Invalid Key' });

  if (row.is_active) {
    if (row.hwid_locked_to === hwid) {
      return res.json({ status: 'Success' });
    } else {
      return res.json({ status: 'Serial already in use' });
    }
  }

  await db.updateKey(key, true, hwid);
  return res.json({ status: 'Success' });
};
