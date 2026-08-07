'use strict';

const { WebSocketServer } = require('ws');
const { hashToken } = require('./utils/security');
const prisma = require('./database');

let wss = null;

// Map userId -> Set<WebSocket>
const userConnections = new Map();

function setup(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    // Extract session token from query string: ws://host/ws?token=...
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    let userId = null;
    if (token) {
      try {
        const tokenHash = hashToken(token);
        const session = await prisma.userSession.findFirst({
          where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
        });
        userId = session?.userId || null;
      } catch {}
    }

    if (!userId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Authentication required.' }));
      ws.close(4001, 'Unauthorized');
      return;
    }

    if (!userConnections.has(userId)) userConnections.set(userId, new Set());
    userConnections.get(userId).add(ws);

    ws.send(JSON.stringify({ type: 'connected', userId, timestamp: new Date().toISOString() }));

    ws.on('close', () => {
      const conns = userConnections.get(userId);
      if (conns) {
        conns.delete(ws);
        if (conns.size === 0) userConnections.delete(userId);
      }
    });

    ws.on('error', () => ws.close());
  });
}

/**
 * Push a notification to all connected clients for a user.
 */
function pushToUser(userId, payload) {
  const conns = userConnections.get(userId);
  if (!conns) return;

  const message = JSON.stringify({ type: 'notification', ...payload, timestamp: new Date().toISOString() });
  for (const ws of conns) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * Broadcast market summary to all connected clients.
 */
function broadcastMarketUpdate(payload) {
  if (!wss) return;
  const message = JSON.stringify({ type: 'market_update', ...payload, timestamp: new Date().toISOString() });
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) ws.send(message);
  }
}

function getConnectionCount() {
  return wss ? wss.clients.size : 0;
}

module.exports = { setup, pushToUser, broadcastMarketUpdate, getConnectionCount };
