'use strict';

const prisma = require('../database');
const { hashToken } = require('../utils/security');
const config = require('../config');
const activityLogger = require('../utils/activityLogger');

const SESSION_COOKIE = 'tricard_session';

/**
 * Resolve the current user from session cookie or API key header.
 * Sets req.user on success. Calls next() regardless.
 */
async function loadUser(req, res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    const apiKeyHeader = req.headers['x-api-key'];

    if (token) {
      const tokenHash = hashToken(token);
      const now = new Date();
      const session = await prisma.userSession.findFirst({
        where: {
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        include: { user: true },
      });
      if (session?.user?.isActive) {
        req.user = session.user;
        req.sessionId = session.id;
      }
    } else if (apiKeyHeader) {
      const keyHash = require('crypto').createHash('sha256').update(apiKeyHeader).digest('hex');
      const apiKey = await prisma.apiKey.findFirst({
        where: { keyHash, isActive: true },
        include: { user: true },
      });
      if (apiKey && apiKey.user?.isActive) {
        const now = new Date();
        if (!apiKey.expiresAt || apiKey.expiresAt > now) {
          req.user = apiKey.user;
          req.apiKeyId = apiKey.id;
          // Update lastUsedAt asynchronously — don't block request
          prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: now } }).catch(() => {});
        }
      }
    }
  } catch {
    // Non-fatal — user simply won't be authenticated
  }
  next();
}

/**
 * Require an authenticated user. Returns 401 if not authenticated.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }
  next();
}

/**
 * Require admin role.
 */
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ detail: 'Not authenticated' });
  if (!req.user.isAdmin) return res.status(403).json({ detail: 'Admin access required' });
  next();
}

module.exports = { loadUser, requireAuth, requireAdmin, SESSION_COOKIE };
