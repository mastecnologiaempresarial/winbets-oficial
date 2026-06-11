const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'winbets.db');
const db = new sqlite3.Database(dbPath);

// Criar tabelas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        balance REAL DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        excerpt TEXT,
        content TEXT,
        image TEXT,
        author TEXT,
        category TEXT,
        views INTEGER DEFAULT 0,
        published INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Criar admin
    const hashedPassword = bcrypt.hashSync('Admin123456', 10);
    db.run(`INSERT OR IGNORE INTO users (name, email, password, is_admin, balance) 
            VALUES (?, ?, ?, ?, ?)`, 
            ['Administrador', 'admin@winbets.com', hashedPassword, 1, 0]);
});

console.log('✅ Banco SQLite inicializado');

async function testConnection() {
    return new Promise((resolve) => {
        db.get('SELECT 1', (err) => {
            resolve(!err);
        });
    });
}

async function initDatabase() {
    return Promise.resolve();
}

// Wrapper para queries
const pool = {
    query: (text, params) => {
        return new Promise((resolve, reject) => {
            if (text.toLowerCase().includes('select')) {
                db.all(text, params || [], (err, rows) => {
                    if (err) reject(err);
                    else resolve({ rows: rows || [], rowCount: rows ? rows.length : 0 });
                });
            } else {
                db.run(text, params || [], function(err) {
                    if (err) reject(err);
                    else resolve({ rows: [], rowCount: this.changes, insertId: this.lastID });
                });
            }
        });
    }
};

module.exports = { pool, initDatabase, testConnection };
