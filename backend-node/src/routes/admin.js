'use strict';

const express = require('express');
const prisma = require('../database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin role
router.use(requireAdmin);

// ── GET /admin/stats ──────────────────────────────────────

router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalCompanies, totalSignals, totalReports, totalNotifications] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.company.count(),
      prisma.signal.count(),
      prisma.report.count(),
      prisma.notification.count(),
    ]);

    const [newUsersToday, newUsersWeek] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.user.count({ where: { createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    ]);

    res.json({
      users: { total: totalUsers, active: activeUsers, newToday: newUsersToday, newThisWeek: newUsersWeek },
      companies: totalCompanies,
      signals: totalSignals,
      reports: totalReports,
      notifications: totalNotifications,
      serverTime: new Date().toISOString(),
      nodeVersion: process.version,
      uptime: Math.round(process.uptime()),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/users ──────────────────────────────────────

router.get('/users', async (req, res, next) => {
  try {
    const { page = '1', limit = '20', q, isActive } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = {};
    if (q) {
      where.OR = [{ email: { contains: q } }, { fullName: { contains: q } }];
    }
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: parseInt(limit, 10),
        select: {
          id: true, email: true, fullName: true, isActive: true, isAdmin: true,
          emailVerified: true, googleSub: true, createdAt: true, updatedAt: true,
          investingStyle: true, _count: { select: { reports: true, sessions: true, notifications: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    next(err);
  }
});

// ── PUT /admin/users/:id ──────────────────────────────────

router.put('/users/:id', async (req, res, next) => {
  try {
    const { isActive, isAdmin, emailVerified } = req.body;
    const updates = {};
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (isAdmin !== undefined) updates.isAdmin = Boolean(isAdmin);
    if (emailVerified !== undefined) updates.emailVerified = Boolean(emailVerified);

    const user = await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: updates });
    res.json({ id: user.id, email: user.email, isActive: user.isActive, isAdmin: user.isAdmin });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /admin/users/:id ───────────────────────────────

router.delete('/users/:id', async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ detail: 'Cannot delete your own account.' });
    }
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/activity ───────────────────────────────────

router.get('/activity', async (req, res, next) => {
  try {
    const { limit = '100', userId } = req.query;
    const where = {};
    if (userId) where.userId = parseInt(userId, 10);

    const logs = await prisma.activityLog.findMany({
      where,
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ── POST /admin/broadcast-notification ────────────────────

router.post('/broadcast', async (req, res, next) => {
  try {
    const { title, body, triggerType = 'admin_broadcast', deepLink } = req.body;
    if (!title || !body) return res.status(400).json({ detail: 'Title and body are required.' });

    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });

    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id, triggerType, channel: 'IN_APP',
        title, body, deepLink: deepLink || null,
        deliveredAt: new Date(),
      })),
    });

    res.json({ message: `Broadcast sent to ${users.length} users.` });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/system-health ──────────────────────────────

router.get('/health', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const memUsage = process.memoryUsage();

    res.json({
      status: 'healthy',
      database: 'connected',
      memory: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      },
      uptime: `${Math.round(process.uptime())}s`,
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

module.exports = router;
