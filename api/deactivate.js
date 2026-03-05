const LicenseDB = require('../license-db');
const db = new LicenseDB();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { key, hwid } = req.body;
  const row = db.getKey(key);

  if (row && row.hwid_locked_to === hwid) {
    db.updateKey(key, false, null);
    return res.json({ status: 'Success' });
  }
  return res.json({ status: 'Invalid' });
};