'use strict';

const crypto = require('crypto');

const ITERATIONS = 200_000;
const DIGEST = 'sha256';
const KEY_LEN = 32;

/**
 * Hash a password using PBKDF2 — returns "salt$hexdigest"
 */
function hashPassword(password, salt = null) {
  const saltValue = salt || crypto.randomBytes(16).toString('hex');
  const digest = crypto.pbkdf2Sync(password, saltValue, ITERATIONS, KEY_LEN, DIGEST);
  return `${saltValue}$${digest.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored hash
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes('$')) return false;
  const [salt] = storedHash.split('$');
  const candidate = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(storedHash));
}

/**
 * Generate a cryptographically secure URL-safe token
 */
function generateToken() {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * SHA-256 hash of a token — used to store session/reset tokens securely
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a random API key — returns { key, keyHash, keyPrefix }
 */
function generateApiKey() {
  const raw = `esg_${crypto.randomBytes(32).toString('base64url')}`;
  return {
    key: raw,
    keyHash: crypto.createHash('sha256').update(raw).digest('hex'),
    keyPrefix: raw.substring(0, 10),
  };
}

module.exports = { hashPassword, verifyPassword, generateToken, hashToken, generateApiKey };
