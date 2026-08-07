'use strict';

function toSnake(str) {
  return str.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`);
}

function deepToSnake(obj) {
  if (Array.isArray(obj)) return obj.map(deepToSnake);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toSnake(k), deepToSnake(v)])
    );
  }
  return obj;
}

/**
 * Express middleware that transforms all JSON response bodies
 * from camelCase (Prisma default) to snake_case (frontend expected).
 */
module.exports = function snakeCaseResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    return originalJson(deepToSnake(body));
  };
  next();
};
