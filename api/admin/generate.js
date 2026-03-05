const LicenseDB = require('../../license-db');
const db = new LicenseDB();

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const created = [];
  for (let i = 0; i < 10; i++) {
    const newKey = db.generateKey();
    db.updateKey(newKey, false, null);
    created.push(newKey);
  }
  res.json({ message: '10 new keys generated', keys: created });
};