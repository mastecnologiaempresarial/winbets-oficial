const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'winbets.db');
let db = null;

function initDatabase() {
    return new Promise((resolve, reject) => {
        console.log('📦 Inicializando SQLite...');
        
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Erro ao abrir SQLite:', err.message);
                reject(err);
                return;
            }
            
            console.log('✅ SQLite conectado com sucesso!');
            
            // Criar tabela users
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                phone TEXT,
                balance REAL DEFAULT 0,
                is_admin INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error('Erro users:', err);
                else console.log('✅ Tabela users OK');
            });
            
            // Criar tabela blog_posts
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
            )`, (err) => {
                if (err) console.error('Erro blog:', err);
                else console.log('✅ Tabela blog_posts OK');
            });
            
            // Criar admin se não existir
            const hashedPassword = bcrypt.hashSync('Admin123456', 10);
            db.run(`INSERT OR IGNORE INTO users (name, email, password, is_admin, balance) 
                    VALUES (?, ?, ?, ?, ?)`, 
                    ['Administrador', 'admin@winbets.com', hashedPassword, 1, 0], 
                    (err) => {
                if (err) console.error('Erro admin:', err);
                else console.log('✅ Usuário admin criado/verificado');
            });
            
            resolve();
        });
    });
}

function testConnection() {
    return new Promise((resolve) => {
        if (!db) {
            resolve(false);
            return;
        }
        db.get('SELECT 1', (err) => {
            resolve(!err);
        });
    });
}

function getDb() {
    return db;
}

module.exports = { pool: { query: (text, params) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        // Adaptar queries SQL para SQLite
        if (text.toLowerCase().includes('select')) {
            db.all(text, params || [], (err, rows) => {
                if (err) reject(err);
                else resolve({ rows: rows, rowCount: rows.length });
            });
        } else {
            db.run(text, params || [], function(err) {
                if (err) reject(err);
                else resolve({ rows: [], rowCount: this.changes, insertId: this.lastID });
            });
        }
    });
}, initDatabase, testConnection, getDb };
