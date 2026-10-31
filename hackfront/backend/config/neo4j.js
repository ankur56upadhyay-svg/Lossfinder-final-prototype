const neo4j = require('neo4j-driver');
const env = require('./env');
const logger = require('../utils/logger');

let driver = null;
let isConnected = false;
let lastError = null;

function initDriver() {
  if (driver) return driver;

  try {
    const auth = neo4j.auth.basic(env.NEO4J_USERNAME, env.NEO4J_PASSWORD);
    driver = neo4j.driver(env.NEO4J_URI, auth, {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 5000,
    });

    logger.info('Neo4j driver initialized', { uri: env.NEO4J_URI });
    return driver;
  } catch (err) {
    lastError = err.message;
    logger.error('Failed to create Neo4j driver', { error: err });
    throw err;
  }
}

async function verifyConnectivity() {
  if (!driver) initDriver();
  try {
    const serverInfo = await driver.getServerInfo();
    isConnected = true;
    lastError = null;
    logger.info('Connected to Neo4j successfully', {
      address: serverInfo.address,
      protocolVersion: serverInfo.protocolVersion
    });
    return { ok: true, version: serverInfo.protocolVersion };
  } catch (err) {
    isConnected = false;
    lastError = err.message;
    logger.error('Neo4j connectivity check failed', { error: err.message });
    return { ok: false, error: 'Database connection failed' };
  }
}

function getDriver() {
  if (!driver) initDriver();
  return driver;
}

function getSession(mode = neo4j.session.WRITE) {
  const d = getDriver();
  return d.session({
    database: env.NEO4J_DATABASE || undefined,
    defaultAccessMode: mode,
  });
}

async function closeDriver() {
  if (driver) {
    logger.info('Closing Neo4j driver');
    await driver.close();
    driver = null;
    isConnected = false;
  }
}

async function initSchema() {
  const session = getSession(neo4j.session.WRITE);
  try {
    const constraints = [
      'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE',
      'CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
      'CREATE CONSTRAINT transaction_id_unique IF NOT EXISTS FOR (t:Transaction) REQUIRE t.transactionId IS UNIQUE',
      'CREATE CONSTRAINT merchant_key_unique IF NOT EXISTS FOR (m:Merchant) REQUIRE m.merchantKey IS UNIQUE',
      'CREATE CONSTRAINT subscription_id_unique IF NOT EXISTS FOR (s:Subscription) REQUIRE s.subscriptionId IS UNIQUE',
      'CREATE CONSTRAINT usage_event_id_unique IF NOT EXISTS FOR (u:UsageEvent) REQUIRE u.usageEventId IS UNIQUE',
      'CREATE CONSTRAINT import_batch_id_unique IF NOT EXISTS FOR (i:ImportBatch) REQUIRE i.importId IS UNIQUE',
    ];

    const indexes = [
      'CREATE INDEX transaction_user_idx IF NOT EXISTS FOR (t:Transaction) ON (t.userId)',
      'CREATE INDEX transaction_date_idx IF NOT EXISTS FOR (t:Transaction) ON (t.transactionDate)',
      'CREATE INDEX transaction_hash_idx IF NOT EXISTS FOR (t:Transaction) ON (t.sourceRowHash)',
      'CREATE INDEX subscription_user_idx IF NOT EXISTS FOR (s:Subscription) ON (s.userId)',
      'CREATE INDEX usage_user_idx IF NOT EXISTS FOR (u:UsageEvent) ON (u.userId)',
      'CREATE INDEX import_user_idx IF NOT EXISTS FOR (i:ImportBatch) ON (i.userId)',
    ];

    for (const c of constraints) {
      await session.run(c);
    }
    for (const idx of indexes) {
      await session.run(idx);
    }
    logger.info('Neo4j schema constraints and indexes verified');
  } catch (err) {
    logger.error('Failed to initialize Neo4j schema', { error: err.message });
    throw err;
  } finally {
    await session.close();
  }
}

function getHealthStatus() {
  return {
    status: isConnected ? 'healthy' : 'disconnected',
    database: 'Neo4j',
    lastError: isConnected ? null : (lastError ? 'Unavailable' : null)
  };
}

module.exports = {
  initDriver,
  getDriver,
  getSession,
  verifyConnectivity,
  closeDriver,
  initSchema,
  getHealthStatus,
};
