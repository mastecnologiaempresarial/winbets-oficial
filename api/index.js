const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { pool, initDatabase, testConnection } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use('/api/', limiter);

const authHandler = require('./auth');
const usersHandler = require('./users');
const blogHandler = require('./blog');
const adminHandler = require('./admin');

app.use('/api/auth', authHandler);
app.use('/api/users', usersHandler);
app.use('/api/blog', blogHandler);
app.use('/api/admin', adminHandler);

app.get('/api/health', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString(), database: 'sqlite' });
});

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

app.use('*', (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

async function startServer() {
    console.log('🚀 Iniciando servidor WIN BETS...');
    await testConnection();
    await initDatabase();
    app.listen(PORT, () => {
        console.log(`✅ Servidor rodando na porta ${PORT}`);
    });
}

startServer();
