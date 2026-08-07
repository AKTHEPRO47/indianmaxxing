'use strict';

require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const config = require('./config');
const prisma = require('./database');
const { loadUser } = require('./middleware/auth');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const snakeCaseResponse = require('./middleware/snakeCase');
const wsModule = require('./websocket');
const { startScheduler } = require('./scheduler');
const { startTelegramBot, stopTelegramBot } = require('./services/telegramBot');
const { seed } = require('./seed/seed');

// ── Routes ────────────────────────────────────────────────
const authRouter = require('./routes/auth');
const accountRouter = require('./routes/account');
const companiesRouter = require('./routes/companies');
const dashboardRouter = require('./routes/dashboard');
const matrixRouter = require('./routes/matrix');
const portfolioRouter = require('./routes/portfolio');
const alertsRouter = require('./routes/alerts');
const apiKeysRouter = require('./routes/apikeys');
const adminRouter = require('./routes/admin');
const marketRouter = require('./routes/market');
const newsRouter = require('./routes/news');

const app = express();
const server = http.createServer(app);

// ── Security & logging middleware ─────────────────────────

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

app.use(morgan(config.isDev ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Snake_case response transformer (Prisma → Frontend) ──

app.use(snakeCaseResponse);

// ── Static uploads ────────────────────────────────────────

app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// ── Session / API key resolution ──────────────────────────

app.use(loadUser);

// ── API rate limiting ─────────────────────────────────────

app.use('/api', apiLimiter);

// ── Health check ──────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ESG Momentum Engine (Node.js)', version: '2.0.0', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────

app.use('/auth', authRouter);
app.use('/account', accountRouter);
app.use('/companies', companiesRouter);
app.use('/dashboard', dashboardRouter);
app.use('/matrix', matrixRouter);
app.use('/portfolios', portfolioRouter);
app.use('/alerts', alertsRouter);
app.use('/api-keys', apiKeysRouter);
app.use('/admin', adminRouter);
app.use('/market', marketRouter);
app.use('/news', newsRouter);

// ── 404 handler ───────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ detail: `Route ${req.method} ${req.path} not found.` });
});

// ── Error handler ─────────────────────────────────────────

app.use(errorHandler);

// ── WebSocket ─────────────────────────────────────────────

wsModule.setup(server);

// ── Startup ───────────────────────────────────────────────

async function start() {
  try {
    // Verify DB connection
    await prisma.$connect();
    console.log('[DB] Connected');

    // Seed on first run
    await seed();

    // Start background scheduler
    startScheduler();
    startTelegramBot();

    // Start HTTP + WebSocket server
    server.listen(config.port, () => {
      console.log(`\n🚀 ESG Momentum Engine (Node.js) running on http://localhost:${config.port}`);
      console.log(`   WebSocket: ws://localhost:${config.port}/ws`);
      console.log(`   Health:    http://localhost:${config.port}/health`);
      console.log(`   Docs:      http://localhost:${config.port}/admin/health (admin only)\n`);
    });
  } catch (err) {
    console.error('[Startup] Fatal error:', err);
    process.exit(1);
  }
}

// ── Graceful shutdown ─────────────────────────────────────

async function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  stopTelegramBot();
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[Shutdown] Clean exit.');
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
