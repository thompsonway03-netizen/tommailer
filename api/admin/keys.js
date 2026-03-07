const LicenseDB = require('../../license-db');
const db = new LicenseDB();

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // GET to list
  if (req.method === 'GET') {
    return res.json(db.getAllKeys());
  }
  res.status(405).end();
};