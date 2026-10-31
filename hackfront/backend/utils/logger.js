const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'jwt', 'secret', 'authorization', 'cookie'];

function sanitize(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message: msg,
      ...sanitize(meta)
    }));
  },
  warn: (msg, meta = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message: msg,
      ...sanitize(meta)
    }));
  },
  error: (msg, meta = {}) => {
    const errorDetails = meta.error instanceof Error ? {
      name: meta.error.name,
      message: meta.error.message,
      // Do not log stack traces with internal credentials
    } : meta.error;

    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: msg,
      ...sanitize({ ...meta, error: errorDetails })
    }));
  },
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({
        level: 'debug',
        timestamp: new Date().toISOString(),
        message: msg,
        ...sanitize(meta)
      }));
    }
  }
};

module.exports = logger;
