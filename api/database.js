const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'winbets.db');
let db;

function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Erro SQLite:', err);
                reject(err);
                return;
            }
            
            // Criar tabelas
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
            const bcrypt = require('bcryptjs');
            const hashedPassword = bcrypt.hashSync('Admin123456', 10);
            
            db.run(`INSERT OR IGNORE INTO users (name, email, password, is_admin) 
                    VALUES (?, ?, ?, ?)`, 
                    ['Administrador', 'admin@winbets.com', hashedPassword, 1]);
            
            console.log('✅ SQLite inicializado!');
            resolve();
        });
    });
}

function testConnection() {
    return new Promise((resolve) => {
        if (db) {
            db.get('SELECT 1', (err) => {
                resolve(!err);
            });
        } else {
            resolve(false);
        }
    });
}

module.exports = { getDb: () => db, initDatabase, testConnection };
