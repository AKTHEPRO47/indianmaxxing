'use strict';

const prisma = require('../database');

/**
 * Log user activity for audit trail
 */
async function log(userId, action, entityType = null, entityId = null, metadata = {}, req = null) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: userId || null,
        action,
        entityType,
        entityId: entityId ? parseInt(entityId, 10) : null,
        metadata: JSON.stringify(metadata),
        ipAddress: req?.ip || null,
        userAgent: req?.headers?.['user-agent'] || null,
      },
    });
  } catch {
    // Non-fatal — don't break requests due to logging failures
  }
}

module.exports = { log };
