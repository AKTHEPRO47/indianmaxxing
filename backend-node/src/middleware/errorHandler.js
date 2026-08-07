'use strict';

function errorHandler(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ detail: 'File too large. Maximum size is 50 MB.' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ detail: 'Invalid JSON body.' });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${new Date().toISOString()}] ${status} ${req.method} ${req.path}:`, err);
  }

  res.status(status).json({ detail: message });
}

module.exports = errorHandler;
