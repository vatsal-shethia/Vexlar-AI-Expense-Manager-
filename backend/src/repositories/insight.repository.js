const Insight = require("../models/Insight");
const logger = require("../utils/logger");

class InsightRepository {
  /**
   * Save or update insight for a user/month
   * @param {Object} insightData - Computed insight data
   * @returns {Object} Saved insight
   */
  async upsert(insightData) {
    try {
      const { userId, groupId, month, type } = insightData;

      // Build unique filter
      const filter = { userId, month, type };
      if (groupId) {
        filter.groupId = groupId;
      }

      // Upsert: Update if exists, create if doesn't
      const insight = await Insight.findOneAndUpdate(
        filter,
        {
          ...insightData,
          computedAt: new Date(),
        },
        {
          upsert: true,
          new: true, // Return updated document
          setDefaultsOnInsert: true,
        }
      );

      logger.info(
        { userId, month, type, groupId },
        "Insight saved successfully"
      );

      return insight;
    } catch (error) {
      logger.error({ error, insightData }, "Failed to save insight");
      throw error;
    }
  }

  /**
   * Find insight by user and month
   * @param {String} userId - User ID
   * @param {String} month - Month (YYYY-MM)
   * @param {String} type - "personal" or "group"
   * @returns {Object|null} Insight or null
   */
  async findByUserAndMonth(userId, month, type = "personal") {
    try {
      const insight = await Insight.findOne({
        userId,
        month,
        type,
      }).lean();

      return insight;
    } catch (error) {
      logger.error({ error, userId, month }, "Failed to find insight");
      throw error;
    }
  }

  /**
   * Find insight by group and month
   * @param {String} groupId - Group ID
   * @param {String} month - Month (YYYY-MM)
   * @returns {Object|null} Insight or null
   */
  async findByGroupAndMonth(groupId, month) {
    try {
      const insight = await Insight.findOne({
        groupId,
        month,
        type: "group",
      }).lean();

      return insight;
    } catch (error) {
      logger.error({ error, groupId, month }, "Failed to find group insight");
      throw error;
    }
  }

  /**
   * Get recent insights for a user
   * @param {String} userId - User ID
   * @param {String} type - "personal" or "group"
   * @param {Number} limit - Number of months
   * @returns {Array} Array of insights
   */
  async findRecentByUser(userId, type = "personal", limit = 6) {
    try {
      const insights = await Insight.find({
        userId,
        type,
      })
        .sort({ month: -1 })
        .limit(limit)
        .lean();

      return insights;
    } catch (error) {
      logger.error({ error, userId, type }, "Failed to find recent insights");
      throw error;
    }
  }

  /**
   * Get insights for trend analysis (multi-month)
   * @param {String} userId - User ID
   * @param {String} type - "personal" or "group"
   * @param {Number} months - Number of months to retrieve
   * @returns {Array} Array of insights
   */
  async findForTrends(userId, type = "personal", months = 3) {
    try {
      const insights = await Insight.find({
        userId,
        type,
      })
        .sort({ month: -1 })
        .limit(months)
        .select("month summary categoryBreakdown trends")
        .lean();

      return insights;
    } catch (error) {
      logger.error({ error, userId, months }, "Failed to find trend insights");
      throw error;
    }
  }

  /**
   * Delete insight (for re-computation)
   * @param {String} userId - User ID
   * @param {String} month - Month (YYYY-MM)
   * @param {String} type - "personal" or "group"
   * @returns {Boolean} Success
   */
  async delete(userId, month, type = "personal") {
    try {
      const result = await Insight.deleteOne({
        userId,
        month,
        type,
      });

      if (result.deletedCount > 0) {
        logger.info({ userId, month, type }, "Insight deleted");
        return true;
      }

      return false;
    } catch (error) {
      logger.error({ error, userId, month }, "Failed to delete insight");
      throw error;
    }
  }

  /**
   * Delete all insights for a user (cleanup)
   * @param {String} userId - User ID
   * @returns {Number} Number deleted
   */
  async deleteAllForUser(userId) {
    try {
      const result = await Insight.deleteMany({ userId });

      logger.info(
        { userId, count: result.deletedCount },
        "All user insights deleted"
      );

      return result.deletedCount;
    } catch (error) {
      logger.error({ error, userId }, "Failed to delete all insights");
      throw error;
    }
  }

  /**
   * Delete all insights for a group (cleanup)
   * @param {String} groupId - Group ID
   * @returns {Number} Number deleted
   */
  async deleteAllForGroup(groupId) {
    try {
      const result = await Insight.deleteMany({ groupId });

      logger.info(
        { groupId, count: result.deletedCount },
        "All group insights deleted"
      );

      return result.deletedCount;
    } catch (error) {
      logger.error({ error, groupId }, "Failed to delete group insights");
      throw error;
    }
  }

  /**
   * Check if insight exists
   * @param {String} userId - User ID
   * @param {String} month - Month (YYYY-MM)
   * @param {String} type - "personal" or "group"
   * @returns {Boolean} Exists
   */
  async exists(userId, month, type = "personal") {
    try {
      const count = await Insight.countDocuments({
        userId,
        month,
        type,
      });

      return count > 0;
    } catch (error) {
      logger.error({ error, userId, month }, "Failed to check existence");
      throw error;
    }
  }

  /**
   * Get all months with insights for a user
   * @param {String} userId - User ID
   * @param {String} type - "personal" or "group"
   * @returns {Array} Array of month strings
   */
  async getAvailableMonths(userId, type = "personal") {
    try {
      const insights = await Insight.find(
        { userId, type },
        { month: 1, _id: 0 }
      )
        .sort({ month: -1 })
        .lean();

      return insights.map((i) => i.month);
    } catch (error) {
      logger.error({ error, userId }, "Failed to get available months");
      throw error;
    }
  }

  /**
   * Bulk insert insights (for migrations/batch processing)
   * @param {Array} insights - Array of insight objects
   * @returns {Number} Number inserted
   */
  async bulkInsert(insights) {
    try {
      const operations = insights.map((insight) => ({
        updateOne: {
          filter: {
            userId: insight.userId,
            month: insight.month,
            type: insight.type,
          },
          update: { $set: insight },
          upsert: true,
        },
      }));

      const result = await Insight.bulkWrite(operations);

      logger.info(
        { inserted: result.upsertedCount, total: insights.length },
        "Bulk insights inserted"
      );

      return result.upsertedCount;
    } catch (error) {
      logger.error({ error }, "Failed to bulk insert insights");
      throw error;
    }
  }
}

module.exports = new InsightRepository();
