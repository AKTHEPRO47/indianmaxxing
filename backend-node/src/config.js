'use strict';

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // Auth
  secretKey: process.env.SECRET_KEY || 'dev-secret-key',
  sessionDays: parseInt(process.env.SESSION_DAYS || '30', 10),

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  useMockLlm: process.env.USE_MOCK_LLM === 'true' || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-placeholder',

  // Google
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map(s => s.trim()),

  // Email
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    username: process.env.SMTP_USERNAME || '',
    password: process.env.SMTP_PASSWORD || '',
    useTls: process.env.SMTP_USE_TLS !== 'false',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@tricard.local',
    fromName: process.env.SMTP_FROM_NAME || 'Tricard Alerts',
  },

  // File uploads
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

module.exports = config;
