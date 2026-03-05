#!/usr/bin/env node
const LicenseDB = require('./license-db');

const db = new LicenseDB();
const generated = [];
for (let i = 0; i < 10; i++) {
  const k = db.generateKey();
  db.updateKey(k, false, null);
  generated.push(k);
}

console.log('Generated serial keys:');
generated.forEach(k => console.log(k));
