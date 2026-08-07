'use strict';

const express = require('express');
const prisma = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generateApiKey } = require('../utils/security');

const router = express.Router();

// ── All routes require authentication ─────────────────────

router.use(requireAuth);

// ── GET /api-keys ─────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      select: { id: true, name: true, keyPrefix: true, scopes: true, isActive: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(keys);
  } catch (err) {
    next(err);
  }
});

// ── POST /api-keys ────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { name, scopes, expiresInDays } = req.body;
    if (!name) return res.status(400).json({ detail: 'API key name is required.' });

    const { key, keyHash, keyPrefix } = generateApiKey();
    const expiresAt = expiresInDays ? new Date(Date.now() + parseInt(expiresInDays, 10) * 86400000) : null;

    const apiKey = await prisma.apiKey.create({
      data: { userId: req.user.id, name, keyHash, keyPrefix, scopes: scopes || 'read', expiresAt },
    });

    // Return the raw key ONCE — it won't be shown again
    res.status(201).json({
      id: apiKey.id, name: apiKey.name, key,
      keyPrefix: apiKey.keyPrefix, scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt, createdAt: apiKey.createdAt,
      warning: 'Store this key securely. It will not be shown again.',
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api-keys/:id ──────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const key = await prisma.apiKey.findFirst({ where: { id: parseInt(req.params.id), userId: req.user.id } });
    if (!key) return res.status(404).json({ detail: 'API key not found.' });

    await prisma.apiKey.update({ where: { id: key.id }, data: { isActive: false } });
    res.json({ message: 'API key revoked.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
