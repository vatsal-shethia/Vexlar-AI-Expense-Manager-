const Transaction = require("../models/Transaction");
const merchantMappingService = require("../services/merchantMapping.service");
const categorizationService = require("../services/categorization.service");
const insightService = require("../services/insight.service");
const logger = require("../utils/logger");
const { ValidationError, NotFoundError } = require("../utils/errors");

class TransactionsController {
  /**
   * Get transactions with filters
   * GET /api/transactions
   */
  async getTransactions(req, res, next) {
    try {
      const userId = req.auth.userId; // From Clerk middleware
      const {
        groupId,
        startDate,
        endDate,
        category,
        uncategorized,
        limit = 1000,
      } = req.query;

      // Build query
      const query = { userId };

      if (groupId) {
        query.groupId = groupId;
      }

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      if (category) {
        query.category = category;
      }

      // Filter for uncategorized only
      if (uncategorized === "true") {
        query.category = null;
      }

      const transactions = await Transaction.find(query)
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .lean();

      logger.info(
        { userId, count: transactions.length, filters: req.query },
        "Transactions fetched"
      );

      res.json({
        success: true,
        data: transactions,
        count: transactions.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single transaction
   * GET /api/transactions/:id
   */
  async getTransaction(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { id } = req.params;

      const transaction = await Transaction.findOne({
        _id: id,
        userId,
      }).lean();

      if (!transaction) {
        throw new NotFoundError("Transaction");
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update transaction category (Manual override)
   * PATCH /api/transactions/:id/category
   */
  async updateCategory(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { id } = req.params;
      const { category } = req.body;

      if (!category) {
        throw new ValidationError("Category is required");
      }

      // Find transaction
      const transaction = await Transaction.findOne({
        _id: id,
        userId,
      });

      if (!transaction) {
        throw new NotFoundError("Transaction");
      }

      // Update transaction
      transaction.category = category.toUpperCase();
      transaction.categoryConfidence = 1.0; // Manual = 100% confidence
      transaction.categorizedBy = "manual";
      transaction.categoryOverriddenAt = new Date();
      await transaction.save();

      // Learn from user correction: Save to merchant mappings
      await merchantMappingService.saveMapping(
        transaction.merchant,
        category,
        1.0,
        userId // User-specific mapping
      );

      // Invalidate insights cache for this month
      const month = transaction.date.toISOString().slice(0, 7);
      await insightService.invalidateInsights(userId, month);

      logger.info(
        {
          transactionId: id,
          merchant: transaction.merchant,
          category,
          userId,
        },
        "Transaction category updated manually"
      );

      res.json({
        success: true,
        message: "Category updated successfully",
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update categories
   * POST /api/transactions/bulk-categorize
   */
  async bulkUpdateCategories(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        throw new ValidationError(
          "Updates array is required with at least one item"
        );
      }

      // Validate format: [{ transactionId, category }, ...]
      const invalidUpdates = updates.filter(
        (u) => !u.transactionId || !u.category
      );
      if (invalidUpdates.length > 0) {
        throw new ValidationError(
          "Each update must have transactionId and category"
        );
      }

      const results = [];
      const errors = [];

      // Process each update
      for (const update of updates) {
        try {
          const transaction = await Transaction.findOne({
            _id: update.transactionId,
            userId,
          });

          if (!transaction) {
            errors.push({
              transactionId: update.transactionId,
              error: "Transaction not found",
            });
            continue;
          }

          // Update transaction
          transaction.category = update.category.toUpperCase();
          transaction.categoryConfidence = 1.0;
          transaction.categorizedBy = "manual";
          transaction.categoryOverriddenAt = new Date();
          await transaction.save();

          // Save to merchant mappings
          await merchantMappingService.saveMapping(
            transaction.merchant,
            update.category,
            1.0,
            userId
          );

          results.push({
            transactionId: update.transactionId,
            success: true,
          });
        } catch (err) {
          errors.push({
            transactionId: update.transactionId,
            error: err.message,
          });
        }
      }

      // Invalidate insights cache for all affected months
      const affectedMonths = new Set();
      for (const update of updates) {
        const txn = await Transaction.findById(update.transactionId);
        if (txn) {
          const month = txn.date.toISOString().slice(0, 7);
          affectedMonths.add(month);
        }
      }

      for (const month of affectedMonths) {
        await insightService.invalidateInsights(userId, month);
      }

      logger.info(
        {
          userId,
          total: updates.length,
          successful: results.length,
          failed: errors.length,
        },
        "Bulk category update completed"
      );

      res.json({
        success: true,
        message: `Updated ${results.length} of ${updates.length} transactions`,
        data: {
          successful: results,
          failed: errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Re-categorize transactions (run categorization again)
   * POST /api/transactions/recategorize
   */
  async recategorizeTransactions(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { transactionIds } = req.body;

      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        throw new ValidationError("transactionIds array is required");
      }

      // Fetch transactions
      const transactions = await Transaction.find({
        _id: { $in: transactionIds },
        userId,
      });

      if (transactions.length === 0) {
        throw new NotFoundError("Transactions");
      }

      // Re-categorize using service
      const categorized = await categorizationService.categorizeBatch(
        transactions,
        userId
      );

      // Update in database
      const updatePromises = categorized.map((txn) =>
        Transaction.updateOne(
          { _id: txn._id },
          {
            category: txn.category,
            categoryConfidence: txn.categoryConfidence,
            categorizedBy: txn.categorizedBy,
          }
        )
      );

      await Promise.all(updatePromises);

      logger.info(
        { userId, count: transactions.length },
        "Transactions re-categorized"
      );

      res.json({
        success: true,
        message: `Re-categorized ${transactions.length} transactions`,
        data: categorized,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get uncategorized transactions count
   * GET /api/transactions/uncategorized/count
   */
  async getUncategorizedCount(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { groupId } = req.query;

      const query = { userId, category: null };
      if (groupId) {
        query.groupId = groupId;
      }

      const count = await Transaction.countDocuments(query);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category statistics
   * GET /api/transactions/stats/categories
   */
  async getCategoryStats(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { groupId, startDate, endDate } = req.query;

      const matchStage = { userId };
      if (groupId) matchStage.groupId = groupId;
      if (startDate || endDate) {
        matchStage.date = {};
        if (startDate) matchStage.date.$gte = new Date(startDate);
        if (endDate) matchStage.date.$lte = new Date(endDate);
      }

      const stats = await Transaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            avgAmount: { $avg: "$amount" },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TransactionsController();
