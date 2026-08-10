'use strict';

const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../database');
const config = require('../config');
const { hashPassword, verifyPassword, generateToken, hashToken } = require('../utils/security');
const { requireAuth, SESSION_COOKIE } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const activityLogger = require('../utils/activityLogger');
const emailService = require('../services/email');

const router = express.Router();
const SESSION_MS = config.sessionDays * 24 * 60 * 60 * 1000;

// ── helpers ──────────────────────────────────────────────

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function userToOut(user) {
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
    notificationPreferences: safeJson(user.notificationPreferencesJson),
    isActive: user.isActive,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    googleConnected: Boolean(user.googleSub),
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  };
}

function safeJson(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

async function issueSession(user, res, req) {
  const rawToken = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MS);

  await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      userAgent: req?.headers?.['user-agent'] || null,
      ipAddress: req?.ip || null,
      expiresAt,
    },
  });

  res.cookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: SESSION_MS,
    path: '/',
  });

  return userToOut(user);
}

// ── GET /auth/me ──────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  res.json(userToOut(req.user));
});

// ── POST /auth/register ───────────────────────────────────

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const {
      email, password, fullName,
      investingStyle, themeMode, accentColor,
      dashboardLayout, cardDensity,
      uiPreferences, notificationPreferences,
    } = req.body;

    if (!email || !password) return res.status(400).json({ detail: 'Email and password are required.' });
    if (password.length < 8) return res.status(400).json({ detail: 'Password must be at least 8 characters.' });

    const normalized = normalizeEmail(email);
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) return res.status(409).json({ detail: 'An account with that email already exists.' });

    const verifyToken = generateToken();

    const user = await prisma.user.create({
      data: {
        email: normalized,
        passwordHash: hashPassword(password),
        fullName: fullName || null,
        investingStyle: investingStyle || 'balanced',
        themeMode: themeMode || 'light',
        accentColor: accentColor || 'slate',
        dashboardLayout: dashboardLayout || 'comfortable',
        cardDensity: cardDensity || 'comfortable',
        uiPreferencesJson: JSON.stringify(uiPreferences || {}),
        notificationPreferencesJson: JSON.stringify(notificationPreferences || {}),
        emailVerifyToken: hashToken(verifyToken),
      },
    });

    // Email delivery cannot delay account creation, but failures are logged by the email service.
    emailService.sendVerificationEmail(user.email, verifyToken);
    activityLogger.log(user.id, 'register', 'user', user.id, {}, req);

    const userOut = await issueSession(user, res, req);
    res.status(201).json({ user: userOut });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/login ──────────────────────────────────────

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ detail: 'Email and password are required.' });

    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (!user?.isActive || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    activityLogger.log(user.id, 'login', 'user', user.id, {}, req);
    const userOut = await issueSession(user, res, req);
    res.json({ user: userOut });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/logout ─────────────────────────────────────

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) {
      const tokenHash = hashToken(token);
      await prisma.userSession.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    activityLogger.log(req.user.id, 'logout', 'user', req.user.id, {}, req);
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/google ─────────────────────────────────────

router.post('/google', authLimiter, async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ detail: 'Google credential is required.' });
    if (!config.googleClientId) return res.status(503).json({ detail: 'Google sign-in is not configured.' });

    const client = new OAuth2Client(config.googleClientId);
    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: config.googleClientId });
      payload = ticket.getPayload();
    } catch (err) {
      return res.status(401).json({ detail: `Google token verification failed: ${err.message}` });
    }

    if (!payload?.email) return res.status(400).json({ detail: 'Google account did not return an email address.' });

    const email = normalizeEmail(payload.email);
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          googleSub: payload.sub,
          fullName: payload.name || payload.given_name || email.split('@')[0],
          avatarUrl: payload.picture || null,
          emailVerified: true,
          investingStyle: 'balanced',
          themeMode: 'light',
          accentColor: 'slate',
          dashboardLayout: 'comfortable',
          cardDensity: 'comfortable',
        },
      });
    } else if (!user.googleSub) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleSub: payload.sub, emailVerified: true, avatarUrl: user.avatarUrl || payload.picture || null },
      });
    }

    if (!user.isActive) return res.status(403).json({ detail: 'Account is deactivated.' });

    activityLogger.log(user.id, 'google_login', 'user', user.id, {}, req);
    const userOut = await issueSession(user, res, req);
    res.json({ user: userOut });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/forgot-password ────────────────────────────

router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ detail: 'Email is required.' });

    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    // Always return success to prevent email enumeration
    if (user?.isActive) {
      const rawToken = generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt },
      });

      emailService.sendPasswordResetEmail(user.email, rawToken).catch(() => {});
      activityLogger.log(user.id, 'forgot_password', 'user', user.id, {}, req);
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/reset-password ─────────────────────────────

router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ detail: 'Token and new password are required.' });
    if (password.length < 8) return res.status(400).json({ detail: 'Password must be at least 8 characters.' });

    const tokenHash = hashToken(token);
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!resetToken) return res.status(400).json({ detail: 'Reset token is invalid or expired.' });

    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash: hashPassword(password) } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      // Revoke all sessions
      prisma.userSession.updateMany({ where: { userId: resetToken.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    activityLogger.log(resetToken.userId, 'password_reset', 'user', resetToken.userId, {}, req);
    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /auth/verify-email ────────────────────────────────

router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ detail: 'Verification token is required.' });

    const tokenHash = hashToken(token);
    const user = await prisma.user.findFirst({ where: { emailVerifyToken: tokenHash } });
    if (!user) return res.status(400).json({ detail: 'Verification token is invalid or already used.' });

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    });

    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/change-password ────────────────────────────

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ detail: 'Both fields are required.' });
    if (newPassword.length < 8) return res.status(400).json({ detail: 'New password must be at least 8 characters.' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.passwordHash && !verifyPassword(currentPassword, user.passwordHash)) {
      return res.status(401).json({ detail: 'Current password is incorrect.' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } });
    activityLogger.log(user.id, 'change_password', 'user', user.id, {}, req);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
});

// ── GET/POST /auth/2fa ────────────────────────────────────

router.post('/2fa/setup', requireAuth, async (req, res, next) => {
  try {
    const speakeasy = require('speakeasy');
    const QRCode = require('qrcode');

    const secret = speakeasy.generateSecret({ name: `ESG Engine (${req.user.email})`, length: 20 });
    await prisma.user.update({ where: { id: req.user.id }, data: { twoFactorSecret: secret.base32 } });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCode: qrCodeUrl });
  } catch (err) {
    next(err);
  }
});

router.post('/2fa/verify', requireAuth, async (req, res, next) => {
  try {
    const speakeasy = require('speakeasy');
    const { token } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.twoFactorSecret) return res.status(400).json({ detail: '2FA is not set up.' });

    const valid = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token, window: 1 });
    if (!valid) return res.status(400).json({ detail: 'Invalid 2FA code.' });

    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
    res.json({ message: '2FA enabled successfully.' });
  } catch (err) {
    next(err);
  }
});

router.post('/2fa/disable', requireAuth, async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    res.json({ message: '2FA disabled.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /auth/sessions ────────────────────────────────────

router.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: { userId: req.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
    });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

router.delete('/sessions/:sessionId', requireAuth, async (req, res, next) => {
  try {
    await prisma.userSession.updateMany({
      where: { id: parseInt(req.params.sessionId), userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.json({ message: 'Session revoked.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
