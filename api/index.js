const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { pool, initDatabase, testConnection } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURAÇÕES DE SEGURANÇA
// ============================================

// CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true
}));

// Segurança
app.use(helmet({
    contentSecurityPolicy: false,
}));

// Compressão
app.use(compression());

// Parse JSON
app.use(express.json({ limit: '10mb' }));

// Rate limiting (protege contra ataques de força bruta)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições por IP
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use('/api/', limiter);

// ============================================
// IMPORTAR ROTAS
// ============================================

const authHandler = require('./auth');
const usersHandler = require('./users');
const blogHandler = require('./blog');
const adminHandler = require('./admin');

// ============================================
// ROTAS DA API
// ============================================

// Rotas de autenticação
app.use('/api/auth', authHandler);

// Rotas de usuários
app.use('/api/users', usersHandler);

// Rotas de blog
app.use('/api/blog', blogHandler);

// Rotas administrativas
app.use('/api/admin', adminHandler);

// ============================================
// ROTAS DE APIS EXISTENTES (MANTIDAS)
// ============================================

// API de Futebol
app.get('/api/football', async (req, res) => {
    try {
        const fetch = require('node-fetch');
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=Soccer`);
        const data = await response.json();
        
        const games = (data.events || []).slice(0, 30).map(event => ({
            id: event.idEvent,
            league: event.strLeague,
            homeTeam: event.strHomeTeam,
            awayTeam: event.strAwayTeam,
            homeScore: event.intHomeScore,
            awayScore: event.intAwayScore,
            status: event.strStatus,
            date: event.dateEvent,
            time: event.strTime,
            venue: event.strVenue
        }));
        
        res.json({ success: true, data: games });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Rota de saúde da API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        database: pool.totalCount ? 'connected' : 'pending'
    });
});

// Rota padrão para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

async function startServer() {
    console.log('\n🚀 Iniciando servidor WIN BETS...\n');
    
    // Testar conexão com banco de dados
    const dbConnected = await testConnection();
    
    if (dbConnected) {
        await initDatabase();
    } else {
        console.log('⚠️ Banco de dados não conectado. Algumas funcionalidades podem não funcionar.');
    }
    
    app.listen(PORT, () => {
        console.log(`\n✅ Servidor rodando em http://localhost:${PORT}`);
        console.log(`📋 API disponível em http://localhost:${PORT}/api/health`);
        console.log('\n🔐 Credenciais Admin padrão:');
        console.log('   Email: admin@winbets.com');
        console.log('   Senha: Admin123456\n');
    });
}

// Iniciar
startServer();