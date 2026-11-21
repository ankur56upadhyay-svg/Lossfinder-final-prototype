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

  async findCredentialsById(userId) {
    const session = getSession(neo4j.session.READ);
    try {
      const result = await session.run(
        `MATCH (u:User { userId: $userId })
         RETURN u.passwordHash AS passwordHash
         LIMIT 1`,
        { userId }
      );
      return result.records.length ? { passwordHash: result.records[0].get('passwordHash') } : null;
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
      const deleted = await session.executeWrite(async tx => {
        const owner = await tx.run(
          `MATCH (u:User { userId: $userId }) RETURN u.userId AS userId LIMIT 1`,
          { userId }
        );
        if (!owner.records.length) return false;

        const merchantResult = await tx.run(
          `MATCH (u:User { userId: $userId })-->(record)-->(m:Merchant)
           RETURN collect(DISTINCT m.merchantKey) AS merchantKeys`,
          { userId }
        );
        const merchantKeys = merchantResult.records[0]?.get('merchantKeys') || [];

        // Delete one kind of user-owned record at a time to avoid a large Cartesian product.
        await tx.run(`MATCH (u:User { userId: $userId })-[:MADE]->(t:Transaction) DETACH DELETE t`, { userId });
        await tx.run(`MATCH (u:User { userId: $userId })-[:TRACKS]->(s:Subscription) DETACH DELETE s`, { userId });
        await tx.run(`MATCH (u:User { userId: $userId })-[:RECORDED_USAGE]->(ue:UsageEvent) DETACH DELETE ue`, { userId });
        await tx.run(`MATCH (u:User { userId: $userId })-[:CREATED_IMPORT]->(i:ImportBatch) DETACH DELETE i`, { userId });
        await tx.run(`MATCH (u:User { userId: $userId }) DETACH DELETE u`, { userId });

        if (merchantKeys.length) {
          // Shared merchants remain while another user's records still reference them.
          await tx.run(
            `MATCH (m:Merchant)
             WHERE m.merchantKey IN $merchantKeys AND NOT EXISTS { MATCH ()-->(m) }
             DELETE m`,
            { merchantKeys }
          );
        }
        return true;
      });

      if (deleted) logger.info('User data deleted completely', { userId });
      return deleted;
    } finally {
      await session.close();
    }
  }
};

module.exports = userRepository;
