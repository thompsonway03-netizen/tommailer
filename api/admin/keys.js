const LicenseDB = require('../../license-db');
const db = new LicenseDB();

module.exports = (req, res) => {
  // GET to list
  if (req.method === 'GET') {
    return res.json(db.getAllKeys());
  }
  res.status(405).end();
};