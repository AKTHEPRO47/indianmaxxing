'use strict';

const { stringify } = require('csv-stringify/sync');

/**
 * Convert an array of objects to a CSV string.
 */
function stringifyCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const records = [headers, ...rows.map(row => headers.map(h => row[h] ?? ''))];
  return stringify(records);
}

module.exports = { stringifyCSV };
