'use strict';

const express = require('express');
const prisma = require('../database');
const { requireAuth } = require('../middleware/auth');
const activityLogger = require('../utils/activityLogger');
const config = require('../config');
const ws = require('../websocket');
const notificationDispatcher = require('../services/notificationDispatcher');

const router = express.Router();

function safeJson(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

function userToOut(user) {
  const notifPrefs = safeJson(user.notificationPreferencesJson) ?? {};
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    timezone: user.timezone,
    language: user.language,
    investingStyle: user.investingStyle,
    themeMode: user.themeMode,
    accentColor: user.accentColor,
    dashboardLayout: user.dashboardLayout,
    cardDensity: user.cardDensity,
    uiPreferences: safeJson(user.uiPreferencesJson),
    notificationPreferences: {
      enabled: true,
      emailAlerts: true,
      livePriceAlerts: true,
      priceMoveThresholdPct: 2.5,
      marketOpenCountries: ['Singapore', 'United States', 'Hong Kong'],
      ...notifPrefs,
    },
    isActive: user.isActive,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    googleConnected: Boolean(user.googleSub),
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  };
}

// ── GET /account/profile ──────────────────────────────────

router.get('/profile', requireAuth, (req, res) => {
  res.json(userToOut(req.user));
});

router.get('/notification-channels', requireAuth, (req, res) => {
  res.json({
    telegram: {
      configured: Boolean(config.telegram.botToken && config.telegram.botUsername),
      botUsername: config.telegram.botUsername || null,
    },
    discord: { configured: true },
    email: { configured: Boolean(config.smtp.host) },
  });
});

// ── PUT /account/profile ──────────────────────────────────

router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const {
      fullName,
      full_name: fullNameSnake,
      investingStyle,
      investing_style: investingStyleSnake,
      email,
      bio,
      timezone,
      language,
    } = req.body;
    const updates = {};

    if (fullName !== undefined || fullNameSnake !== undefined) {
      updates.fullName = (fullName ?? fullNameSnake)?.trim() || null;
    }
    if (investingStyle !== undefined || investingStyleSnake !== undefined) {
      updates.investingStyle = investingStyle ?? investingStyleSnake;
    }
    if (bio !== undefined) updates.bio = bio?.trim() || null;
    if (timezone !== undefined) updates.timezone = timezone;
    if (language !== undefined) updates.language = language;

    if (email !== undefined) {
      const normalized = email.trim().toLowerCase();
      if (normalized !== req.user.email) {
        const conflict = await prisma.user.findUnique({ where: { email: normalized } });
        if (conflict) return res.status(409).json({ detail: 'Email already in use.' });
        updates.email = normalized;
        updates.emailVerified = false;
      }
    }

    const updated = await prisma.user.update({ where: { id: req.user.id }, data: updates });
    activityLogger.log(req.user.id, 'update_profile', 'user', req.user.id, {}, req);
    res.json(userToOut(updated));
  } catch (err) {
    next(err);
  }
});

// ── PUT /account/preferences ──────────────────────────────

router.put('/preferences', requireAuth, async (req, res, next) => {
  try {
    const {
      themeMode,
      theme_mode: themeModeSnake,
      accentColor,
      accent_color: accentColorSnake,
      dashboardLayout,
      dashboard_layout: dashboardLayoutSnake,
      cardDensity,
      card_density: cardDensitySnake,
      uiPreferences,
      ui_preferences: uiPreferencesSnake,
      notificationPreferences,
      notification_preferences: notificationPreferencesSnake,
    } = req.body;
    const updates = {};

    if (themeMode ?? themeModeSnake) updates.themeMode = themeMode ?? themeModeSnake;
    if (accentColor ?? accentColorSnake) updates.accentColor = accentColor ?? accentColorSnake;
    if (dashboardLayout ?? dashboardLayoutSnake) updates.dashboardLayout = dashboardLayout ?? dashboardLayoutSnake;
    if (cardDensity ?? cardDensitySnake) updates.cardDensity = cardDensity ?? cardDensitySnake;
    if (uiPreferences ?? uiPreferencesSnake) updates.uiPreferencesJson = JSON.stringify(uiPreferences ?? uiPreferencesSnake);
    if (notificationPreferences ?? notificationPreferencesSnake) updates.notificationPreferencesJson = JSON.stringify(notificationPreferences ?? notificationPreferencesSnake);

    const updated = await prisma.user.update({ where: { id: req.user.id }, data: updates });
    res.json(userToOut(updated));
  } catch (err) {
    next(err);
  }
});

// ── Avatar upload ──────────────────────────────────────────

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(config.uploadDir, 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `user_${req.user.id}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed.'));
    cb(null, true);
  },
});

router.post('/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ detail: 'No file uploaded.' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl } });
    res.json({ avatarUrl });
  } catch (err) {
    next(err);
  }
});

// ── Notifications ──────────────────────────────────────────

router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const { limit = '50', unreadOnly = 'false' } = req.query;
    const where = { userId: req.user.id };
    if (unreadOnly === 'true') where.readAt = null;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: parseInt(limit, 10),
    });
    res.json(notifications.map(n => ({ ...n, metadata: safeJson(n.metadataJson) })));
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
    });
    if (!notification) return res.status(404).json({ detail: 'Notification not found.' });

    if (!notification.readAt) {
      await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
    }
    const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
    res.json({ ...updated, metadata: safeJson(updated.metadataJson) });
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/read-all', requireAuth, async (req, res, next) => {
  try {
    const { count } = await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ message: 'All notifications marked as read.', updated: count });
  } catch (err) {
    next(err);
  }
});

router.delete('/notifications/:id', requireAuth, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
    });
    if (!notification) return res.status(404).json({ detail: 'Notification not found.' });
    await prisma.notification.delete({ where: { id: notification.id } });
    res.json({ message: 'Notification deleted.' });
  } catch (err) {
    next(err);
  }
});

// ── Watchlist ──────────────────────────────────────────────

router.get('/watchlist', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.userWatchlistItem.findMany({
      where: { userId: req.user.id },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items.map(i => i.company));
  } catch (err) {
    next(err);
  }
});

router.post('/watchlist/:companyId', requireAuth, async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });

    const existing = await prisma.userWatchlistItem.findUnique({
      where: { userId_companyId: { userId: req.user.id, companyId } },
    });
    if (existing) return res.json({ message: 'Already in watchlist.', created: false });

    await prisma.userWatchlistItem.create({ data: { userId: req.user.id, companyId } });
    const notification = await prisma.notification.create({
      data: {
        userId: req.user.id,
        companyId,
        triggerType: 'watchlist_added',
        channel: 'IN_APP',
        title: 'Added to watchlist',
        body: `${company.name}${company.ticker ? ` (${company.ticker})` : ''} is now being tracked.`,
        deepLink: `/#/companies/${companyId}`,
        deliveredAt: new Date(),
      },
    });
    const delivery = await notificationDispatcher.dispatchInAppNotification({
      user: req.user,
      title: notification.title,
      body: notification.body,
      triggerType: notification.triggerType,
      companyName: company.name,
    });
    await prisma.notification.update({
      where: { id: notification.id },
      data: { metadataJson: JSON.stringify({ delivery }) },
    });
    ws.pushToUser(req.user.id, { notification });
    res.json({ message: 'Added to watchlist.', created: true, notification, delivery });
  } catch (err) {
    next(err);
  }
});

router.delete('/watchlist/:companyId', requireAuth, async (req, res, next) => {
  try {
    await prisma.userWatchlistItem.deleteMany({
      where: { userId: req.user.id, companyId: parseInt(req.params.companyId) },
    });
    res.json({ message: 'Removed from watchlist.' });
  } catch (err) {
    next(err);
  }
});

// ── Favorites ──────────────────────────────────────────────

router.get('/favorites', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.userFavoriteItem.findMany({
      where: { userId: req.user.id },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items.map(i => i.company));
  } catch (err) {
    next(err);
  }
});

router.post('/favorites/:companyId', requireAuth, async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ detail: 'Company not found.' });

    await prisma.userFavoriteItem.upsert({
      where: { userId_companyId: { userId: req.user.id, companyId } },
      update: {},
      create: { userId: req.user.id, companyId },
    });
    res.json({ message: 'Added to favorites.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/favorites/:companyId', requireAuth, async (req, res, next) => {
  try {
    await prisma.userFavoriteItem.deleteMany({
      where: { userId: req.user.id, companyId: parseInt(req.params.companyId) },
    });
    res.json({ message: 'Removed from favorites.' });
  } catch (err) {
    next(err);
  }
});

// ── Company Tags (Extra Feature 5) ────────────────────────

router.get('/tags', requireAuth, async (req, res, next) => {
  try {
    const tags = await prisma.userCompanyTag.findMany({
      where: { userId: req.user.id },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

router.post('/tags/:companyId', requireAuth, async (req, res, next) => {
  try {
    const { tag } = req.body;
    if (!tag) return res.status(400).json({ detail: 'Tag is required.' });
    const companyId = parseInt(req.params.companyId);

    await prisma.userCompanyTag.upsert({
      where: { userId_companyId_tag: { userId: req.user.id, companyId, tag } },
      update: {},
      create: { userId: req.user.id, companyId, tag },
    });
    res.json({ message: 'Tag added.', tag });
  } catch (err) {
    next(err);
  }
});

router.delete('/tags/:companyId', requireAuth, async (req, res, next) => {
  try {
    const { tag } = req.body;
    const companyId = parseInt(req.params.companyId);
    const where = { userId: req.user.id, companyId };
    if (tag) where.tag = tag;

    await prisma.userCompanyTag.deleteMany({ where });
    res.json({ message: 'Tag(s) removed.' });
  } catch (err) {
    next(err);
  }
});

// ── Activity log ──────────────────────────────────────────

router.get('/activity', requireAuth, async (req, res, next) => {
  try {
    const { limit = '50' } = req.query;
    const logs = await prisma.activityLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ── Export account data (GDPR-style) ──────────────────────

router.get('/export', requireAuth, async (req, res, next) => {
  try {
    const [user, watchlist, favorites, notifications, activityLogs] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.id } }),
      prisma.userWatchlistItem.findMany({ where: { userId: req.user.id }, include: { company: true } }),
      prisma.userFavoriteItem.findMany({ where: { userId: req.user.id }, include: { company: true } }),
      prisma.notification.findMany({ where: { userId: req.user.id } }),
      prisma.activityLog.findMany({ where: { userId: req.user.id } }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: userToOut(user),
      watchlist: watchlist.map(i => i.company),
      favorites: favorites.map(i => i.company),
      notifications: notifications.length,
      activityLogs: activityLogs.length,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="my-esg-data.json"');
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

// ── Reports (uploaded documents) ──────────────────────────

router.get('/reports', requireAuth, async (req, res, next) => {
  try {
    const reports = await prisma.report.findMany({
      where: { userId: req.user.id },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

router.patch('/reports/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { file_name } = req.body;
    const report = await prisma.report.findFirst({ where: { id, userId: req.user.id } });
    if (!report) return res.status(404).json({ detail: 'Report not found' });
    const updated = await prisma.report.update({ where: { id }, data: { fileName: file_name } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/reports/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const report = await prisma.report.findFirst({ where: { id, userId: req.user.id } });
    if (!report) return res.status(404).json({ detail: 'Report not found' });
    await prisma.report.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
