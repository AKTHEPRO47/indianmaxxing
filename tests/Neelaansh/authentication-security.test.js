'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateToken, hashPassword, hashToken, verifyPassword } = require('../../backend-node/src/utils/security');

test('password hashes verify only the original password', () => {
  const storedHash = hashPassword('correct-horse-battery-staple', 'fixed-test-salt');

  assert.equal(verifyPassword('correct-horse-battery-staple', storedHash), true);
  assert.equal(verifyPassword('wrong-password', storedHash), false);
});

test('session tokens are random and only their SHA-256 hashes are deterministic', () => {
  const firstToken = generateToken();
  const secondToken = generateToken();

  assert.notEqual(firstToken, secondToken);
  assert.match(hashToken(firstToken), /^[a-f0-9]{64}$/);
  assert.equal(hashToken(firstToken), hashToken(firstToken));
});