const LicenseDB = require('../../license-db');
const db = new LicenseDB();

module.exports = async (req, res) => {
  console.log(`[GENERATE] Request received. Method: ${req.method}, Count: ${req.query.count}`);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.warn(`[GENERATE] Rejected non-POST request: ${req.method}`);
    return res.status(405).end();
  }

  const count = Math.min(parseInt(req.query.count) || 10, 100);
  const created = [];

  console.log(`[GENERATE] Generating ${count} keys...`);

  for (let i = 0; i < count; i++) {
    const newKey = db.generateKey();
    await db.updateKey(newKey, false, null);
    created.push(newKey);
  }

  console.log(`[GENERATE] Successfully generated keys: ${created.slice(0, 3).join(', ')}...`);
  res.json({ message: `${count} new keys generated`, keys: created });
};
