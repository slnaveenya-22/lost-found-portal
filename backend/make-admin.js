require('dotenv').config();
const db = require('./db');

// Change this to the email of the account you want to make admin
const TARGET_EMAIL = 'mathumithadr@gmail.com';

(async () => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, email, role FROM users WHERE email = ?',
            [TARGET_EMAIL]
        );

        if (rows.length === 0) {
            console.log(`❌ No user found with email: ${TARGET_EMAIL}`);
            process.exit(1);
        }

        await db.query('UPDATE users SET role = ? WHERE id = ?', ['admin', rows[0].id]);

        const [updated] = await db.query(
            'SELECT id, name, email, role FROM users WHERE id = ?',
            [rows[0].id]
        );

        console.log('✅ Promoted:', updated[0]);
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit(0);
    }
})();