require('dotenv').config();
const db = require('./db');

(async () => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM status_history ORDER BY id DESC LIMIT 10'
        );

        if (rows.length === 0) {
            console.log('status_history is empty — no PATCH has been recorded yet.');
        } else {
            console.table(rows);
        }
    } catch (err) {
        console.error('❌', err.message);
    } finally {
        process.exit(0);
    }
})();