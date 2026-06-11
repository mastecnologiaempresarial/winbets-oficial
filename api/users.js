const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'winbets_super_secret_key_2026';

// Middleware para verificar token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// Obter perfil do usuário
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, phone, balance, is_admin, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// Atualizar perfil
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { name, phone } = req.body;
        
        const result = await pool.query(
            'UPDATE users SET name = $1, phone = $2 WHERE id = $3 RETURNING id, name, email, phone, balance',
            [name, phone, req.user.id]
        );
        
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});

// Obter saldo
router.get('/balance', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT balance FROM users WHERE id = $1',
            [req.user.id]
        );
        
        res.json({ success: true, balance: result.rows[0]?.balance || 0 });
    } catch (error) {
        console.error('Erro ao buscar saldo:', error);
        res.status(500).json({ error: 'Erro ao buscar saldo' });
    }
});

module.exports = router;