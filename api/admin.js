const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('./database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'winbets_super_secret_key_2026';

const verifyAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await pool.query('SELECT is_admin FROM users WHERE id = ?', [decoded.id]);
        if (!result.rows[0]?.is_admin) return res.status(403).json({ error: 'Acesso negado' });
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, phone, balance, is_admin, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, users: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

router.put('/users/:id/balance', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { balance } = req.body;
        await pool.query('UPDATE users SET balance = ? WHERE id = ?', [balance, id]);
        const result = await pool.query('SELECT id, name, balance FROM users WHERE id = ?', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar saldo' });
    }
});

router.post('/blog/posts', verifyAdmin, async (req, res) => {
    try {
        const { title, excerpt, content, image, author, category } = req.body;
        const result = await pool.query(`INSERT INTO blog_posts (title, excerpt, content, image, author, category, published) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`, [title, excerpt, content, image, author, category, 1]);
        res.status(201).json({ success: true, post: { id: result.insertId, title, excerpt, content, image, author, category } });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar post' });
    }
});

module.exports = router;
