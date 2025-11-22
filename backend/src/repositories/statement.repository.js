const Statement = require("../models/Statement");
const logger = require("../utils/logger");

class StatementRepository {
  /**
   * Create a new statement record
   */
  async create(statementData) {
    try {
      const statement = await Statement.create(statementData);
      logger.info({ statementId: statement._id }, "Statement record created");
      return statement;
    } catch (error) {
      logger.error({ error, statementData }, "Failed to create statement");
      throw error;
    }
  }

  /**
   * Update statement status
   */
  async updateStatus(statementId, status, additionalData = {}) {
    try {
      const update = { status, ...additionalData };

      if (status === "completed") {
        update.processedAt = new Date();
      }

      const statement = await Statement.findByIdAndUpdate(statementId, update, {
        new: true,
      });

      logger.info({ statementId, status }, "Statement status updated");
      return statement;
    } catch (error) {
      logger.error(
        { error, statementId, status },
        "Failed to update statement"
      );
      throw error;
    }
  }

  /**
   * Check if file hash already exists (duplicate detection)
   */
  async findByHash(fileHash, userId) {
    try {
      const statement = await Statement.findOne({ fileHash, userId });
      return statement;
    } catch (error) {
      logger.error({ error, fileHash }, "Failed to check file hash");
      throw error;
    }
  }

  /**
   * Get statements for a user
   */
  async findByUser(userId, limit = 50) {
    try {
      const statements = await Statement.find({ userId })
        .sort({ uploadedAt: -1 })
        .limit(limit)
        .lean();
      return statements;
    } catch (error) {
      logger.error({ error, userId }, "Failed to fetch user statements");
      throw error;
    }
  }

  /**
   * Get statements for a group
   */
  async findByGroup(groupId, limit = 50) {
    try {
      const statements = await Statement.find({ groupId })
        .sort({ uploadedAt: -1 })
        .limit(limit)
        .lean();
      return statements;
    } catch (error) {
      logger.error({ error, groupId }, "Failed to fetch group statements");
      throw error;
    }
  }

  /**
   * Get statement by ID
   */
  async findById(statementId) {
    try {
      const statement = await Statement.findById(statementId).lean();
      return statement;
    } catch (error) {
      logger.error({ error, statementId }, "Failed to fetch statement");
      throw error;
    }
  }

  /**
   * Delete statement
   */
  async delete(statementId) {
    try {
      await Statement.findByIdAndDelete(statementId);
      logger.info({ statementId }, "Statement deleted");
      return true;
    } catch (error) {
      logger.error({ error, statementId }, "Failed to delete statement");
      throw error;
    }
  }
}

module.exports = new StatementRepository();
