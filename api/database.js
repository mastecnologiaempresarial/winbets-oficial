const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco de dados
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
});

// Testar conexão
async function testConnection() {
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Banco de dados conectado com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar ao banco de dados:', error.message);
        return false;
    }
}

// Inicializar tabelas
async function initDatabase() {
    try {
        // Tabela de usuários
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
        console.log('✅ Tabela users verificada/criada');
        
        // Tabela de blog_posts
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
        console.log('✅ Tabela blog_posts verificada/criada');
        
        // Verificar se admin existe
        const adminCheck = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@winbets.com']);
        
        if (adminCheck.rows.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('Admin123456', 10);
            
            await pool.query(
                `INSERT INTO users (name, email, password, is_admin, balance)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['Administrador', 'admin@winbets.com', hashedPassword, true, 0]
            );
            console.log('✅ Usuário admin criado');
        }
        
        // Verificar se há posts de exemplo
        const postsCheck = await pool.query('SELECT COUNT(*) FROM blog_posts');
        
        if (parseInt(postsCheck.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO blog_posts (title, excerpt, content, author, category, published)
                VALUES 
                ('Bem-vindo ao WIN BETS', 'A melhor plataforma de apostas esportivas com IA', 'Conteúdo completo...', 'WIN BETS Team', 'noticias', true),
                ('Como começar a apostar', 'Guia completo para iniciantes', 'Conteúdo completo...', 'WIN BETS Team', 'guias', true)
            `);
            console.log('✅ Posts de exemplo criados');
        }
        
        console.log('✅ Banco de dados inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error);
    }
}

module.exports = { pool, initDatabase, testConnection };