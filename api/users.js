const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('./database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'winbets_super_secret_key_2026';

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

router.get('/profile', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, phone, balance, is_admin, created_at FROM users WHERE id = ?', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { name, phone } = req.body;
        await pool.query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, req.user.id]);
        const result = await pool.query('SELECT id, name, email, phone, balance FROM users WHERE id = ?', [req.user.id]);
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});

router.get('/balance', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        res.json({ success: true, balance: result.rows[0]?.balance || 0 });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar saldo' });
    }
});

module.exports = router;
