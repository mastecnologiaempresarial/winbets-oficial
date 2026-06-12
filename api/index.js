const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com o banco de dados Supabase
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: { rejectUnauthorized: false }
});

// ============================================
// ROTA DE SAÚDE (TESTE)
// ============================================
app.get('/api/health', async (req, res) => {
    try {
        const client = await pool.connect();
        client.release();
        res.json({ status: 'online', database: 'connected', timestamp: new Date() });
    } catch (error) {
        res.json({ status: 'online', database: 'error', error: error.message });
    }
});

// ============================================
// ROTA DE REGISTRO (CADASTRO)
// ============================================
app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password, referralCode } = req.body;

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
    }

    try {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        const affiliateCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        // Verificar se email já existe
        const existing = await pool.query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'E-mail ou telefone já cadastrado' });
        }

        // Buscar referenciador (afiliado)
        let referredBy = null;
        if (referralCode) {
            const referrer = await pool.query('SELECT id FROM users WHERE affiliate_code = $1', [referralCode]);
            if (referrer.rows.length > 0) {
                referredBy = referrer.rows[0].id;
            }
        }

        await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, affiliate_code, referred_by)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [name, email, phone, hashedPassword, affiliateCode, referredBy]
        );

        res.status(201).json({ success: true, message: 'Cadastro realizado com sucesso!' });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// ROTA DE LOGIN
// ============================================
app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Preencha todos os campos' });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM users WHERE email = $1 OR phone = $1`,
            [identifier]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = result.rows[0];

        if (user.is_banned) {
            return res.status(403).json({ error: 'Conta banida. Contate o suporte.' });
        }

        const bcrypt = require('bcryptjs');
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: user.id, email: user.email, is_admin: user.is_admin || false },
            process.env.JWT_SECRET || 'winbets_fallback_secret',
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
                plan: user.plan || 'free',
                plan_expires: user.plan_expires,
                affiliate_code: user.affiliate_code,
                commissions: parseFloat(user.commissions || 0),
                total_referrals: user.total_referrals || 0,
                bankroll: parseFloat(user.bankroll || 1000),
                is_admin: user.is_admin || false
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// ROTA PARA VERIFICAR TOKEN
// ============================================
app.get('/api/auth/verify', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'winbets_fallback_secret');

        const result = await pool.query(
            `SELECT id, name, email, phone, plan, plan_expires, affiliate_code, commissions, total_referrals, bankroll, is_admin
             FROM users WHERE id = $1`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        const user = result.rows[0];
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                plan: user.plan,
                plan_expires: user.plan_expires,
                affiliate_code: user.affiliate_code,
                commissions: parseFloat(user.commissions || 0),
                total_referrals: user.total_referrals || 0,
                bankroll: parseFloat(user.bankroll || 1000),
                is_admin: user.is_admin || false
            }
        });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

// ============================================
// ROTA DE PERFIL DO USUÁRIO
// ============================================
app.get('/api/users/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'winbets_fallback_secret');

        const result = await pool.query(
            `SELECT id, name, email, phone, plan, plan_expires, affiliate_code, commissions, total_referrals, bankroll, is_admin
             FROM users WHERE id = $1`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const user = result.rows[0];
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                plan: user.plan,
                plan_expires: user.plan_expires,
                affiliate_code: user.affiliate_code,
                commissions: parseFloat(user.commissions || 0),
                total_referrals: user.total_referrals || 0,
                bankroll: parseFloat(user.bankroll || 1000),
                is_admin: user.is_admin || false
            }
        });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

// ============================================
// ROTA DE RANKING (AFILIADOS)
// ============================================
app.get('/api/users/ranking', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, commissions, total_referrals, affiliate_code
            FROM users
            WHERE commissions > 0 OR total_referrals > 0
            ORDER BY commissions DESC
            LIMIT 50
        `);

        const ranking = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            commissions: parseFloat(row.commissions || 0),
            total_referrals: row.total_referrals || 0,
            affiliate_code: row.affiliate_code
        }));

        res.json({ success: true, ranking });
    } catch (error) {
        console.error('Erro no ranking:', error);
        res.status(500).json({ error: 'Erro ao buscar ranking' });
    }
});

// ============================================
// ROTA PARA SOLICITAR SAQUE
// ============================================
app.post('/api/users/withdraw', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const { amount, paymentMethod } = req.body;

    if (!amount || amount < 10) {
        return res.status(400).json({ error: 'Valor mínimo de saque: 10 USD' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'winbets_fallback_secret');

        const userResult = await pool.query('SELECT plan, commissions FROM users WHERE id = $1', [decoded.id]);
        const user = userResult.rows[0];

        if (user.plan !== 'pro') {
            return res.status(403).json({ error: 'Apenas usuários PRO podem sacar' });
        }

        if (amount > parseFloat(user.commissions || 0)) {
            return res.status(400).json({ error: 'Saldo de comissões insuficiente' });
        }

        await pool.query('BEGIN');
        await pool.query(
            `INSERT INTO withdrawals (user_id, amount, payment_method, status)
             VALUES ($1, $2, $3, 'pending')`,
            [decoded.id, amount, paymentMethod]
        );
        await pool.query('UPDATE users SET commissions = commissions - $1 WHERE id = $2', [amount, decoded.id]);
        await pool.query('COMMIT');

        res.json({ success: true, message: `Saque de ${amount} USD solicitado com sucesso!` });
    } catch (error) {
        await pool.query('ROLLBACK');
        res.status(401).json({ error: 'Token inválido' });
    }
});

// ============================================
// ROTA PARA ALTERAR SENHA
// ============================================
app.put('/api/users/change-password', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const { currentPassword, newPassword } = req.body;

    if (newPassword && newPassword.length < 8) {
        return res.status(400).json({ error: 'Nova senha deve ter 8+ caracteres' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const bcrypt = require('bcryptjs');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'winbets_fallback_secret');

        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [decoded.id]);
        const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

        if (!valid) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, decoded.id]);

        res.json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

// ============================================
// ROTAS DO BLOG
// ============================================
app.get('/api/blog/posts', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, u.name as author_name
            FROM blog_posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.published = true
            ORDER BY p.created_at DESC
            LIMIT 50
        `);

        res.json({ success: true, posts: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar posts' });
    }
});

// ============================================
// ROTAS ADMINISTRATIVAS
// ============================================
app.get('/api/admin/stats', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'winbets_fallback_secret');

        if (!decoded.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
        const proUsers = await pool.query("SELECT COUNT(*) FROM users WHERE plan = 'pro'");
        const totalBets = await pool.query('SELECT COUNT(*) FROM bet_history');
        const totalBankroll = await pool.query('SELECT SUM(bankroll) FROM users');

        res.json({
            success: true,
            stats: {
                totalUsers: parseInt(totalUsers.rows[0].count),
                proUsers: parseInt(proUsers.rows[0].count),
                totalBets: parseInt(totalBets.rows[0].count || 0),
                totalBankroll: parseFloat(totalBankroll.rows[0].sum || 0)
            }
        });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

app.get('/api/admin/users', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'winbets_fallback_secret');

        if (!decoded.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await pool.query(`
            SELECT id, name, email, phone, plan, commissions, total_referrals, is_banned, is_admin, bankroll, created_at
            FROM users
            ORDER BY created_at DESC
        `);

        res.json({ success: true, users: result.rows });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

// ============================================
// ROTA PADRÃO PARA ROTAS NÃO ENCONTRADAS
// ============================================
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// ============================================
// EXPORTAR PARA O RENDER/VERCEL
// ============================================
module.exports = app;