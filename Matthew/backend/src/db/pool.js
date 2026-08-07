'use strict';

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

module.exports = { getPool };
