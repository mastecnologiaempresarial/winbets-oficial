const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('./database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'winbets_super_secret_key_2026';

// Middleware para verificar token de admin
const verifyAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const result = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [decoded.id]
        );
        
        if (!result.rows[0]?.is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador.' });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// Listar todos os usuários
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, phone, balance, is_admin, created_at FROM users ORDER BY created_at DESC'
        );
        
        res.json({ success: true, users: result.rows });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

// Atualizar saldo do usuário
router.put('/users/:id/balance', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { balance } = req.body;
        
        const result = await pool.query(
            'UPDATE users SET balance = $1 WHERE id = $2 RETURNING id, name, balance',
            [balance, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar saldo:', error);
        res.status(500).json({ error: 'Erro ao atualizar saldo' });
    }
});

// Criar post no blog
router.post('/blog/posts', verifyAdmin, async (req, res) => {
    try {
        const { title, excerpt, content, image, author, category } = req.body;
        
        const result = await pool.query(
            `INSERT INTO blog_posts (title, excerpt, content, image, author, category, published, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             RETURNING *`,
            [title, excerpt, content, image, author, category, true]
        );
        
        res.status(201).json({ success: true, post: result.rows[0] });
    } catch (error) {
        console.error('Erro ao criar post:', error);
        res.status(500).json({ error: 'Erro ao criar post' });
    }
});

module.exports = router;