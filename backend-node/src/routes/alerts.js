'use strict';

const express = require('express');
const prisma = require('../database');
const { requireAuth } = require('../middleware/auth');
const notificationDispatcher = require('../services/notificationDispatcher');
const ws = require('../websocket');

const router = express.Router();

const VALID_TRIGGER_TYPES = [
  'esg_drop', 'esg_rise', 'controversy_spike', 'momentum_change',
  'ai_adoption_change', 'new_signal', 'new_report',
];

// ── GET /alerts ───────────────────────────────────────────

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const alerts = await prisma.alertRule.findMany({
      where: { userId: req.user.id },
      include: { company: { select: { id: true, name: true, ticker: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

// ── POST /alerts ──────────────────────────────────────────

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, triggerType, companyId, threshold, operator } = req.body;
    if (!name) return res.status(400).json({ detail: 'Alert name is required.' });
    if (!triggerType || !VALID_TRIGGER_TYPES.includes(triggerType)) {
      return res.status(400).json({ detail: `triggerType must be one of: ${VALID_TRIGGER_TYPES.join(', ')}` });
    }

    if (companyId) {
      const company = await prisma.company.findUnique({ where: { id: parseInt(companyId) } });
      if (!company) return res.status(404).json({ detail: 'Company not found.' });
    }

    const alert = await prisma.alertRule.create({
      data: {
        userId: req.user.id,
        name,
        triggerType,
        companyId: companyId ? parseInt(companyId) : null,
        threshold: threshold != null ? parseFloat(threshold) : null,
        operator: operator || 'gt',
      },
    });
    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
});

// ── PUT /alerts/:id ───────────────────────────────────────

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const alert = await prisma.alertRule.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
    });
    if (!alert) return res.status(404).json({ detail: 'Alert not found.' });

    const { name, threshold, operator, isActive } = req.body;
    const updated = await prisma.alertRule.update({
      where: { id: alert.id },
      data: {
        name: name ?? alert.name,
        threshold: threshold != null ? parseFloat(threshold) : alert.threshold,
        operator: operator ?? alert.operator,
        isActive: isActive != null ? Boolean(isActive) : alert.isActive,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /alerts/:id ────────────────────────────────────

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const alert = await prisma.alertRule.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
    });
    if (!alert) return res.status(404).json({ detail: 'Alert not found.' });
    await prisma.alertRule.delete({ where: { id: alert.id } });
    res.json({ message: 'Alert deleted.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /alerts/test/:id ─────────────────────────────────

router.post('/test/:id', requireAuth, async (req, res, next) => {
  try {
    const alert = await prisma.alertRule.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      include: { company: true },
    });
    if (!alert) return res.status(404).json({ detail: 'Alert not found.' });

    const notification = await prisma.notification.create({
      data: {
        userId: req.user.id,
        companyId: alert.companyId || null,
        triggerType: alert.triggerType,
        channel: 'IN_APP',
        title: `[TEST] Alert triggered: ${alert.name}`,
        body: `This is a test notification for alert "${alert.name}" (${alert.triggerType}).`,
        metadataJson: JSON.stringify({ email: { status: 'pending' } }),
        deliveredAt: new Date(),
      },
    });

    const delivery = await notificationDispatcher.dispatchAlert({
      user: req.user,
      alert,
      companyName: alert.company?.name,
      title: notification.title,
      body: notification.body,
      forceBroadcast: true,
    }).catch(error => ({ email: { status: 'failed', error: error.message } }));
    const email = delivery.email ?? { status: 'disabled' };

    await prisma.notification.update({ where: { id: notification.id }, data: { metadataJson: JSON.stringify({ delivery }) } });
    ws.pushToUser(req.user.id, { id: notification.id, title: notification.title, body: notification.body, emailStatus: email.status });
    res.json({ message: 'Test notification sent.', delivery });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
