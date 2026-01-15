// const { createClient } = require("redis");
// const logger = require("../utils/logger");

// let redisClient = null;

// const connectRedis = async () => {
//   try {
//     redisClient = createClient({
//       url: process.env.REDIS_URL,
//       password: process.env.REDIS_TOKEN,
//       socket: {
//         reconnectStrategy: (retries) => {
//           if (retries > 10) {
//             logger.error("Redis max reconnection attempts reached");
//             return new Error("Redis reconnection failed");
//           }
//           return retries * 100; // Exponential backoff
//         },
//       },
//     });

//     redisClient.on("error", (err) => {
//       logger.error({ err }, "Redis client error");
//     });

//     redisClient.on("connect", () => {
//       logger.info("Redis connecting...");
//     });

//     redisClient.on("ready", () => {
//       logger.info("Redis connected successfully");
//     });

//     redisClient.on("reconnecting", () => {
//       logger.warn("Redis reconnecting...");
//     });

//     await redisClient.connect();

//     // Graceful shutdown
//     process.on("SIGINT", async () => {
//       await redisClient.quit();
//       logger.info("Redis connection closed due to app termination");
//     });

//     return redisClient;
//   } catch (error) {
//     logger.error({ error }, "Redis connection failed");
//     // Don't exit - app can work without cache
//     return null;
//   }
// };

// const getRedisClient = () => {
//   if (!redisClient) {
//     logger.warn("Redis client not initialized");
//   }
//   return redisClient;
// };

// module.exports = { connectRedis, getRedisClient };

const { createClient } = require("redis");
const logger = require("../utils/logger");

let redisClient = null;

const connectRedis = async () => {
  try {
    const options = {
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error("Redis max reconnection attempts reached");
            return new Error("Redis reconnection failed");
          }
          return retries * 100;
        },
      },
    };

    // ✅ ONLY set password if Redis actually has one
    if (process.env.REDIS_TOKEN) {
      options.password = process.env.REDIS_TOKEN;
    }

    redisClient = createClient(options);

    redisClient.on("error", (err) => {
      logger.error(err, "Redis client error");
    });

    redisClient.on("connect", () => {
      logger.info("Redis connecting...");
    });

    redisClient.on("ready", () => {
      logger.info("Redis connected successfully");
    });

    redisClient.on("reconnecting", () => {
      logger.warn("Redis reconnecting...");
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error(error, "Redis connection failed");
    return null; // App continues without Redis
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    logger.warn("Redis client not initialized");
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
