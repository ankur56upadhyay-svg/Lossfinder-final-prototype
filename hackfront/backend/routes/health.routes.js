const express = require('express');
const { getHealthStatus, verifyConnectivity } = require('../config/neo4j');

const router = express.Router();

router.get('/', async (req, res) => {
  const connectivity = await verifyConnectivity();
  const health = getHealthStatus();

  const statusCode = connectivity.ok ? 200 : 503;
  res.status(statusCode).json({
    status: connectivity.ok ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: {
      type: 'Neo4j',
      connected: connectivity.ok
    }
  });
});

module.exports = router;
