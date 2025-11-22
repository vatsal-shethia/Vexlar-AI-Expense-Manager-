const Transaction = require("../models/Transaction");
const logger = require("../utils/logger");

class TransactionRepository {
  /**
   * Bulk insert transactions
   */
  async bulkInsert(transactions) {
    try {
      // Insert in batches to avoid memory issues
      const batchSize = 500;
      const results = [];

      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        const inserted = await Transaction.insertMany(batch, {
          ordered: false, // Continue on duplicate errors
        });
        results.push(...inserted);
      }

      logger.info(
        { count: results.length, total: transactions.length },
        "Transactions bulk inserted"
      );

      return results;
    } catch (error) {
      // If some succeeded and some failed, log both
      if (error.insertedDocs) {
        logger.warn(
          {
            inserted: error.insertedDocs.length,
            failed: transactions.length - error.insertedDocs.length,
          },
          "Partial bulk insert completed"
        );
        return error.insertedDocs;
      }

      logger.error({ error }, "Failed to bulk insert transactions");
      throw error;
    }
  }

  /**
   * Get transactions for a user
   */
  async findByUser(userId, filters = {}) {
    try {
      const query = { userId };

      // Add optional filters
      if (filters.groupId !== undefined) {
        query.groupId = filters.groupId;
      }
      if (filters.startDate) {
        query.date = { $gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        query.date = { ...query.date, $lte: new Date(filters.endDate) };
      }
      if (filters.category) {
        query.category = filters.category;
      }

      const transactions = await Transaction.find(query)
        .sort({ date: -1 })
        .limit(filters.limit || 1000)
        .lean();

      return transactions;
    } catch (error) {
      logger.error({ error, userId, filters }, "Failed to fetch transactions");
      throw error;
    }
  }

  /**
   * Update transactions to mark as group expenses
   */
  async markAsGroupExpenses(transactionIds, groupId, userId) {
    try {
      const result = await Transaction.updateMany(
        {
          _id: { $in: transactionIds },
          userId, // Security: only update own transactions
        },
        {
          groupId,
          isGroupExpense: true,
          sharedAt: new Date(),
        }
      );

      logger.info(
        { count: result.modifiedCount, groupId },
        "Transactions marked as group expenses"
      );

      return result.modifiedCount;
    } catch (error) {
      logger.error(
        { error, transactionIds, groupId },
        "Failed to mark group expenses"
      );
      throw error;
    }
  }

  /**
   * Delete transactions by statement ID
   */
  async deleteByStatement(statementId) {
    try {
      const result = await Transaction.deleteMany({ statementId });
      logger.info(
        { statementId, count: result.deletedCount },
        "Transactions deleted"
      );
      return result.deletedCount;
    } catch (error) {
      logger.error({ error, statementId }, "Failed to delete transactions");
      throw error;
    }
  }
}

module.exports = new TransactionRepository();
