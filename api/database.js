const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
});

async function testConnection() {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Banco conectado!');
        return true;
    } catch (error) {
        console.error('❌ Erro:', error.message);
        return false;
    }
}

async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                balance DECIMAL(10,2) DEFAULT 0,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS blog_posts (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                excerpt TEXT,
                content TEXT,
                image VARCHAR(500),
                author VARCHAR(100),
                category VARCHAR(50),
                views INTEGER DEFAULT 0,
                published BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        const adminCheck = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@winbets.com']);
        if (adminCheck.rows.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('Admin123456', 10);
            await pool.query(
                `INSERT INTO users (name, email, password, is_admin, balance)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['Administrador', 'admin@winbets.com', hashedPassword, true, 0]
            );
        }
        console.log('✅ Banco inicializado');
    } catch (error) {
        console.error('Erro:', error);
    }
}

module.exports = { pool, initDatabase, testConnection };
