require('dotenv').config();
const db = require('./db');

(async () => {
  try {
    const [lost] = await db.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lost_items' AND COLUMN_NAME = 'status'`,
      [process.env.DB_NAME]
    );
    console.log('lost_items.status:', lost[0]?.COLUMN_TYPE);

    const [found] = await db.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'found_items' AND COLUMN_NAME = 'status'`,
      [process.env.DB_NAME]
    );
    console.log('found_items.status:', found[0]?.COLUMN_TYPE);

    const [hist] = await db.query('SHOW TABLES LIKE "status_history"');
    console.log('status_history exists:', hist.length > 0);
  } catch (err) {
    console.error('❌', err.message);
  } finally {
    process.exit(0);
  }
})();