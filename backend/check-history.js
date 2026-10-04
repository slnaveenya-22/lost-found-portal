require('dotenv').config();
const db = require('./db');

(async () => {
  try {
    const [tables] = await db.query("SHOW TABLES LIKE 'status_history'");
    console.log('status_history exists:', tables.length > 0);

    if (tables.length > 0) {
      const [cols] = await db.query('SHOW COLUMNS FROM status_history');
      console.log('columns:', cols.map((c) => c.Field).join(', '));
    }
  } catch (err) {
    console.error('❌', err.message);
  } finally {
    process.exit(0);
  }
})();