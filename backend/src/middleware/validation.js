const { ValidationError } = require("../utils/errors");
const logger = require("../utils/logger");

/**
 * Zod schema validation middleware factory
 * @param {ZodSchema} schema - Zod validation schema
 * @param {string} source - Where to validate: 'body', 'query', 'params'
 */
const validate = (schema, source = "body") => {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];

      // Validate with Zod
      const validated = await schema.parseAsync(dataToValidate);

      // Replace with validated data (type-safe and sanitized)
      req[source] = validated;

      next();
    } catch (error) {
      logger.warn({ error, source }, "Validation failed");

      if (error.errors) {
        // Zod validation errors
        const messages = error.errors.map(
          (err) => `${err.path.join(".")}: ${err.message}`
        );
        next(new ValidationError(messages.join(", ")));
      } else {
        next(new ValidationError("Validation failed"));
      }
    }
  };
};

module.exports = { validate };
