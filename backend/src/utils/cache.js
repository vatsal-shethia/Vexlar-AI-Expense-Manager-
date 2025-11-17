const logger = require("./logger");

class CacheHelper {
  constructor(redisClient) {
    this.client = redisClient;
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug({ key }, "Cache hit");
        return JSON.parse(value);
      }
      logger.debug({ key }, "Cache miss");
      return null;
    } catch (error) {
      logger.error({ error, key }, "Cache get error");
      return null;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      logger.debug({ key, ttl: ttlSeconds }, "Cache set");
      return true;
    } catch (error) {
      logger.error({ error, key }, "Cache set error");
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      logger.debug({ key }, "Cache deleted");
      return true;
    } catch (error) {
      logger.error({ error, key }, "Cache delete error");
      return false;
    }
  }

  async delPattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.debug({ pattern, count: keys.length }, "Cache pattern deleted");
      }
      return true;
    } catch (error) {
      logger.error({ error, pattern }, "Cache pattern delete error");
      return false;
    }
  }

  // Helper to build cache keys
  static keys = {
    personalInsight: (userId, month) => `insights:personal:${userId}:${month}`,
    groupInsight: (groupId, month) => `insights:group:${groupId}:${month}`,
    userProfile: (userId) => `user:${userId}`,
    aiResponse: (hash) => `ai:response:${hash}`,
  };
}

module.exports = CacheHelper;
