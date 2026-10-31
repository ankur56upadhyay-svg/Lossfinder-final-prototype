const app = require('./app');
const env = require('./config/env');
const { initDriver, verifyConnectivity, initSchema, closeDriver } = require('./config/neo4j');
const logger = require('./utils/logger');

async function startServer() {
  try {
    initDriver();

    const connectivity = await verifyConnectivity();
    if (connectivity.ok) {
      logger.info('Connected to Neo4j. Initializing schema constraints and indexes...');
      try {
        await initSchema();
      } catch (schemaErr) {
        logger.warn('Schema setup warning (non-fatal):', { message: schemaErr.message });
      }
    } else {
      logger.warn('Neo4j connectivity check returned offline. The server will start, but database operations will fail until Neo4j is available.', {
        uri: env.NEO4J_URI
      });
    }

    const server = app.listen(env.PORT, () => {
      logger.info(`Loss Finder server running at http://localhost:${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await closeDriver();
        logger.info('Neo4j connection closed. Exiting process.');
        process.exit(0);
      });

      // Force exit after 10s if hanging
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (err) {
    logger.error('Failed to start server:', { error: err });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
