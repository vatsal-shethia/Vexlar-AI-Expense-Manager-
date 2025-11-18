// const { clerkClient } = require("@clerk/express");
// const { UnauthorizedError } = require("../utils/errors");
// const logger = require("../utils/logger");
// const User = require("../models/User");

// /**
//  * Clerk authentication middleware
//  * Verifies JWT and attaches user info to req.auth
//  */
// const requireAuth = async (req, res, next) => {
//   try {
//     // Get token from header
//     const token = req.headers.authorization?.replace("Bearer ", "");

//     if (!token) {
//       throw new UnauthorizedError("No authentication token provided");
//     }

//     // Verify token with Clerk
//     const { sessionClaims } = await clerkClient.verifyToken(token, {
//       secretKey: process.env.CLERK_SECRET_KEY,
//     });

//     if (!sessionClaims) {
//       throw new UnauthorizedError("Invalid authentication token");
//     }

//     // Find or sync user in our database
//     const user = await User.findOne({ clerkId: sessionClaims.sub });

//     if (!user) {
//       throw new UnauthorizedError(
//         "User not found. Please sync your account first."
//       );
//     }

//     // Attach user info to request
//     req.auth = {
//       userId: user._id,
//       clerkId: user.clerkId,
//       email: user.email,
//       sessionClaims,
//     };

//     next();
//   } catch (error) {
//     logger.error({ error }, "Authentication failed");
//     next(error);
//   }
// };

// /**
//  * Optional auth - doesn't fail if no token
//  * Useful for endpoints that work with or without auth
//  */
// const optionalAuth = async (req, res, next) => {
//   try {
//     const token = req.headers.authorization?.replace("Bearer ", "");

//     if (!token) {
//       req.auth = null;
//       return next();
//     }

//     const { sessionClaims } = await clerkClient.verifyToken(token, {
//       secretKey: process.env.CLERK_SECRET_KEY,
//     });

//     if (sessionClaims) {
//       const user = await User.findOne({ clerkId: sessionClaims.sub });

//       if (user) {
//         req.auth = {
//           userId: user._id,
//           clerkId: user.clerkId,
//           email: user.email,
//           sessionClaims,
//         };
//       }
//     }

//     next();
//   } catch (error) {
//     // Silent fail for optional auth
//     req.auth = null;
//     next();
//   }
// };

// module.exports = {
//   requireAuth,
//   optionalAuth,
// };

const { createClerkClient } = require("@clerk/express");
const { UnauthorizedError } = require("../utils/errors");
const logger = require("../utils/logger");
const User = require("../models/User");

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Clerk authentication middleware
 * Verifies JWT and attaches user info to req.auth
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No authentication token provided");
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify token with Clerk
    let clerkUserId;
    try {
      const { userId } = await clerkClient.verifyToken(token);
      clerkUserId = userId;
    } catch (err) {
      logger.warn({ err }, "Token verification failed");
      throw new UnauthorizedError("Invalid authentication token");
    }

    if (!clerkUserId) {
      throw new UnauthorizedError("Invalid authentication token");
    }

    // Find user in our database
    const user = await User.findOne({ clerkId: clerkUserId });

    if (!user) {
      throw new UnauthorizedError(
        "User not found. Please sync your account first."
      );
    }

    // Attach user info to request
    req.auth = {
      userId: user._id,
      clerkId: user.clerkId,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      logger.error({ error }, "Authentication failed");
      next(new UnauthorizedError("Authentication failed"));
    }
  }
};

/**
 * Optional auth - doesn't fail if no token
 * Useful for endpoints that work with or without auth
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.auth = null;
      return next();
    }

    const token = authHeader.replace("Bearer ", "");

    try {
      const { userId } = await clerkClient.verifyToken(token);

      if (userId) {
        const user = await User.findOne({ clerkId: userId });

        if (user) {
          req.auth = {
            userId: user._id,
            clerkId: user.clerkId,
            email: user.email,
          };
        }
      }
    } catch (err) {
      // Silent fail for optional auth
      logger.debug({ err }, "Optional auth failed");
    }

    next();
  } catch (error) {
    // Silent fail for optional auth
    req.auth = null;
    next();
  }
};

module.exports = {
  requireAuth,
  optionalAuth,
  clerkClient,
};
