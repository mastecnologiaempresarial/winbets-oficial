const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'winbets_super_secret_key_2026';

// Registrar novo usuário
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        // Validar campos
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }
        
        // Verificar se usuário já existe
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        
        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Inserir usuário
        const result = await pool.query(
            `INSERT INTO users (name, email, password, phone, balance, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id, name, email, phone, balance, created_at`,
            [name, email, hashedPassword, phone || null, 0]
        );
        
        const user = result.rows[0];
        
        // Gerar token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                balance: user.balance
            }
        });
        
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        
        // Buscar usuário
        const result = await pool.query(
            'SELECT id, name, email, password, phone, balance, is_admin, created_at FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }
        
        const user = result.rows[0];
        
        // Verificar senha
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }
        
        // Gerar token
        const token = jwt.sign(
            { id: user.id, email: user.email, isAdmin: user.is_admin },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                balance: user.balance,
                isAdmin: user.is_admin,
                createdAt: user.created_at
            }
        });
        
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// Verificar token (middleware)
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

// Rota para verificar token atual
router.get('/verify', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, phone, balance, is_admin FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json({
            success: true,
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('Erro na verificação:', error);
        res.status(500).json({ error: 'Erro ao verificar token' });
    }
});

module.exports = router;