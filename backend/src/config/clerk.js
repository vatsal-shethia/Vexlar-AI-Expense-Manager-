const logger = require("../utils/logger");

const clerkConfig = {
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
};

// Validate config on startup
const validateClerkConfig = () => {
  if (!clerkConfig.publishableKey || !clerkConfig.secretKey) {
    logger.error("Clerk configuration missing");
    throw new Error("CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are required");
  }
  logger.info("Clerk configuration validated");
};

module.exports = {
  clerkConfig,
  validateClerkConfig,
};
