const fs = require('fs');
const path = require('path');
const LicenseDB = require('../license-db');

module.exports = (req, res) => {
    const db = new LicenseDB();
    const dbPath = db.dbFile;

    const results = {
        timestamp: new Date().toISOString(),
        env: {
            VERCEL: process.env.VERCEL || 'false',
            NODE_ENV: process.env.NODE_ENV || 'development'
        },
        database: {
            path: dbPath,
            exists: fs.existsSync(dbPath),
            writable: false,
            error: null
        }
    };

    try {
        // Attempt to write a tiny test file in the same directory
        const testFile = path.join(path.dirname(dbPath), '.test-write');
        fs.writeFileSync(testFile, 'test');
        results.database.writable = true;
        fs.unlinkSync(testFile);
    } catch (e) {
        results.database.error = e.message;
    }

    res.json(results);
};
