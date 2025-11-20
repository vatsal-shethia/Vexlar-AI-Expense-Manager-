// require("dotenv").config();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = require("./app");
const connectDB = require("./config/database");
const { connectRedis } = require("./config/redis");
const { initGemini } = require("./config/gemini");
const { validateClerkConfig } = require("./config/clerk");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Validate required environment variables
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is required");
    }

    // Validate Clerk configuration
    validateClerkConfig();

    // Connect to MongoDB
    await connectDB();
    logger.info("Database connected");

    // Connect to Redis (non-blocking)
    await connectRedis();
    logger.info("Redis connected");

    // Initialize Gemini AI
    initGemini();
    logger.info("Gemini AI initialized");

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(` Server running on port ${PORT}`);
      logger.info(` Environment: ${process.env.NODE_ENV}`);
      logger.info(` Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);

      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
};

// Start the server
startServer();
