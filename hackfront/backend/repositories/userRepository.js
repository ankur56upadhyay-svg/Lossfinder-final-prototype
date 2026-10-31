const neo4j = require('neo4j-driver');
const { getSession } = require('../config/neo4j');
const logger = require('../utils/logger');

const userRepository = {
  async findByEmail(email) {
    const session = getSession(neo4j.session.READ);
    try {
      const result = await session.run(
        `MATCH (u:User { email: $email })
         RETURN u.userId AS userId, u.email AS email, u.passwordHash AS passwordHash, u.createdAt AS createdAt
         LIMIT 1`,
        { email: email.toLowerCase() }
      );
      if (!result.records.length) return null;
      const rec = result.records[0];
      return {
        userId: rec.get('userId'),
        email: rec.get('email'),
        passwordHash: rec.get('passwordHash'),
        createdAt: rec.get('createdAt')
      };
    } finally {
      await session.close();
    }
  },

  async findById(userId) {
    const session = getSession(neo4j.session.READ);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })
         RETURN u.userId AS userId, u.email AS email, u.createdAt AS createdAt
         LIMIT 1`,
        { userId }
      );
      if (!result.records.length) return null;
      const rec = result.records[0];
      return {
        userId: rec.get('userId'),
        email: rec.get('email'),
        createdAt: rec.get('createdAt')
      };
    } finally {
      await session.close();
    }
  },

  async createUser({ userId, email, passwordHash, createdAt }) {
    const session = getSession(neo4j.session.WRITE);
    try {
      const result = await session.run(
        `CREATE (u:User {
           userId: $userId,
           email: $email,
           passwordHash: $passwordHash,
           createdAt: $createdAt
         })
         RETURN u.userId AS userId, u.email AS email, u.createdAt AS createdAt`,
        {
          userId,
          email: email.toLowerCase(),
          passwordHash,
          createdAt: createdAt || new Date().toISOString()
        }
      );
      const rec = result.records[0];
      return {
        userId: rec.get('userId'),
        email: rec.get('email'),
        createdAt: rec.get('createdAt')
      };
    } finally {
      await session.close();
    }
  },

  async deleteUserData(userId) {
    const session = getSession(neo4j.session.WRITE);
    try {
      // Delete user's transactions, imports, subscriptions, usage events, and the user itself
      // Never delete Merchant nodes if they are still referenced by other users
      await session.run(
        `MATCH (u:User { userId: $userId })
         OPTIONAL MATCH (u)-[:MADE]->(t:Transaction)
         OPTIONAL MATCH (u)-[:TRACKS]->(s:Subscription)
         OPTIONAL MATCH (u)-[:RECORDED_USAGE]->(ue:UsageEvent)
         OPTIONAL MATCH (u)-[:CREATED_IMPORT]->(i:ImportBatch)
         DETACH DELETE t, s, ue, i, u`,
        { userId }
      );

      // Clean up orphaned merchants that have no transactions, subscriptions, or usage attached
      await session.run(
        `MATCH (m:Merchant)
         WHERE NOT ()-[:PAID_TO]->(m) AND NOT ()-[:FOR_MERCHANT]->(m) AND NOT ()-[:RELATES_TO]->(m)
         DELETE m`
      );

      logger.info('User data deleted completely', { userId });
      return true;
    } finally {
      await session.close();
    }
  }
};

module.exports = userRepository;
