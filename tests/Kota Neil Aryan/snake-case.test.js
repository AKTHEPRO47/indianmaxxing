'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const snakeCaseResponse = require('../../backend-node/src/middleware/snakeCase');

test('snakeCaseResponse converts nested Prisma-style JSON keys', () => {
  let received;
  const response = {
    json(body) {
      received = body;
      return body;
    },
  };

  snakeCaseResponse({}, response, () => {});
  response.json({ latestScore: { currentEsgScore: 72 }, companyTags: [{ createdAt: '2026-08-07' }] });

  assert.deepEqual(received, {
    latest_score: { current_esg_score: 72 },
    company_tags: [{ created_at: '2026-08-07' }],
  });
});