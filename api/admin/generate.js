const LicenseDB = require('../../license-db');
const db = new LicenseDB();

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const count = Math.min(parseInt(req.query.count) || 10, 100);
  const created = [];
  for (let i = 0; i < count; i++) {
    const newKey = db.generateKey();
    db.updateKey(newKey, false, null);
    created.push(newKey);
  }
  res.json({ message: `${count} new keys generated`, keys: created });
};
