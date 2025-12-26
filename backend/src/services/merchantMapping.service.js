const MerchantMapping = require("../models/MerchantMapping");
const logger = require("../utils/logger");

class MerchantMappingService {
  /**
   * Find mapping for a merchant
   * Priority: User-specific > System-wide
   * @param {String} merchant - Merchant name
   * @param {String} userId - User ID (optional)
   * @returns {Object|null} Mapping object or null
   */
  async findMapping(merchant, userId = null) {
    try {
      const merchantLower = merchant.toLowerCase().trim();

      // Build query: check user-specific first, then system-wide
      const query = {
        merchant: merchantLower,
        $or: [],
      };

      // If userId provided, check user-specific mappings first
      if (userId) {
        query.$or.push({ userId });
      }

      // Always check system-wide mappings
      query.$or.push({ userId: null });

      // Find with priority: user-specific first
      const mapping = await MerchantMapping.findOne(query).sort({
        userId: -1, // Non-null userId comes first
      });

      if (mapping) {
        logger.debug(
          { merchant: merchantLower, category: mapping.category, userId },
          "Merchant mapping found"
        );
      }

      return mapping;
    } catch (error) {
      logger.error({ error, merchant }, "Failed to find merchant mapping");
      return null;
    }
  }

  /**
   * Save or update a merchant mapping
   * @param {String} merchant - Merchant name
   * @param {String} category - Category name
   * @param {Number} confidence - Confidence score (0-1)
   * @param {String} userId - User ID (null for system-wide)
   * @returns {Object} Created/updated mapping
   */
  async saveMapping(merchant, category, confidence = 1.0, userId = null) {
    try {
      const merchantLower = merchant.toLowerCase().trim();
      const categoryUpper = category.toUpperCase().trim();

      // Upsert: update if exists, create if doesn't
      const mapping = await MerchantMapping.findOneAndUpdate(
        {
          merchant: merchantLower,
          userId: userId || null,
        },
        {
          category: categoryUpper,
          confidence,
          $inc: { timesMatched: 1 }, // Increment usage counter
        },
        {
          upsert: true, // Create if doesn't exist
          new: true, // Return updated document
          setDefaultsOnInsert: true,
        }
      );

      logger.info(
        {
          merchant: merchantLower,
          category: categoryUpper,
          userId: userId || "system",
          timesMatched: mapping.timesMatched,
        },
        "Merchant mapping saved"
      );

      return mapping;
    } catch (error) {
      logger.error(
        { error, merchant, category },
        "Failed to save merchant mapping"
      );
      throw error;
    }
  }

  /**
   * Bulk insert system-wide mappings (for seeding)
   * @param {Array} mappings - Array of {merchant, category, confidence}
   * @returns {Number} Number of mappings created
   */
  async bulkInsert(mappings) {
    try {
      const operations = mappings.map((mapping) => ({
        updateOne: {
          filter: {
            merchant: mapping.merchant.toLowerCase().trim(),
            userId: null, // System-wide only
          },
          update: {
            $setOnInsert: {
              merchant: mapping.merchant.toLowerCase().trim(),
              category: mapping.category.toUpperCase().trim(),
              confidence: mapping.confidence || 1.0,
              userId: null,
              timesMatched: 0,
            },
          },
          upsert: true,
        },
      }));

      const result = await MerchantMapping.bulkWrite(operations);

      logger.info(
        {
          inserted: result.upsertedCount,
          modified: result.modifiedCount,
          total: mappings.length,
        },
        "Bulk merchant mappings inserted"
      );

      return result.upsertedCount;
    } catch (error) {
      logger.error({ error }, "Failed to bulk insert merchant mappings");
      throw error;
    }
  }

  /**
   * Get all mappings for a user (including system-wide)
   * @param {String} userId - User ID
   * @returns {Array} Array of mappings
   */
  async getUserMappings(userId) {
    try {
      const mappings = await MerchantMapping.find({
        $or: [{ userId }, { userId: null }],
      })
        .sort({ merchant: 1 })
        .lean();

      logger.debug({ userId, count: mappings.length }, "User mappings fetched");

      return mappings;
    } catch (error) {
      logger.error({ error, userId }, "Failed to get user mappings");
      throw error;
    }
  }

  /**
   * Delete a user-specific mapping
   * @param {String} merchant - Merchant name
   * @param {String} userId - User ID
   * @returns {Boolean} Success
   */
  async deleteUserMapping(merchant, userId) {
    try {
      const merchantLower = merchant.toLowerCase().trim();

      const result = await MerchantMapping.deleteOne({
        merchant: merchantLower,
        userId,
      });

      if (result.deletedCount > 0) {
        logger.info(
          { merchant: merchantLower, userId },
          "User mapping deleted"
        );
        return true;
      }

      return false;
    } catch (error) {
      logger.error(
        { error, merchant, userId },
        "Failed to delete user mapping"
      );
      throw error;
    }
  }

  /**
   * Get top merchants by usage (analytics)
   * @param {Number} limit - Number of results
   * @returns {Array} Top merchants
   */
  async getTopMerchants(limit = 50) {
    try {
      const topMerchants = await MerchantMapping.find({ userId: null })
        .sort({ timesMatched: -1 })
        .limit(limit)
        .select("merchant category timesMatched confidence")
        .lean();

      return topMerchants;
    } catch (error) {
      logger.error({ error }, "Failed to get top merchants");
      throw error;
    }
  }
}

module.exports = new MerchantMappingService();
