const logger = require("../utils/logger");
const { AppError } = require("../utils/errors");

/**
 * Global error handling middleware
 * Must be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error(
    {
      err,
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params,
      userId: req.auth?.userId,
    },
    "Request error"
  );

  // Operational errors (known errors we throw)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.name,
      },
    });
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: Object.values(err.errors).map((e) => e.message),
      },
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: {
        message: `${field} already exists`,
        code: "DUPLICATE_ERROR",
      },
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: {
        message: "Invalid ID format",
        code: "INVALID_ID",
      },
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: {
        message: "Invalid token",
        code: "INVALID_TOKEN",
      },
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: {
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      },
    });
  }

  // Unknown errors (programming errors)
  // Don't leak error details in production
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong"
      : err.message;

  return res.status(500).json({
    success: false,
    error: {
      message,
      code: "INTERNAL_ERROR",
    },
  });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.url} not found`,
      code: "NOT_FOUND",
    },
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
