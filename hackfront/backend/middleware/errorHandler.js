const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled request error', {
    url: req.originalUrl,
    method: req.method,
    error: err
  });

  if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'The submitted request contains malformed JSON.'
      }
    });
  }

  // Handle Neo4j errors without exposing queries, passwords, or connection URIs
  if (err.name === 'Neo4jError' || err.code?.startsWith('Neo.')) {
    return res.status(503).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'The database encountered an error. Please try again shortly.'
      }
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500
    ? 'An unexpected error occurred. Please try again later.'
    : (err.message || 'Error processing request');

  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message
    }
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`
    }
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
