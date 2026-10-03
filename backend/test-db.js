require('dotenv').config();

const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function test() {
    try {
        const [result] = await pool.promise().query('SELECT 1 AS result');

        console.log('✅ Database connected!');
        console.log(result);
    } catch (error) {
        console.log('❌ Database connection failed!');
        console.log(error.message);
    } finally {
        pool.end();
    }
}

test();