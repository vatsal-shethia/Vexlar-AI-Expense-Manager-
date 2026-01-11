const parserService = require("../parsers");
const insightService = require("./insight.service");
const groupExpenseDetector = require("./groupExpenseDetector.service");
const categorizationService = require("./categorization.service");
const statementRepository = require("../repositories/statement.repository");
const transactionRepository = require("../repositories/transaction.repository");
const { calculateFileHash } = require("../utils/helpers");
const { ConflictError, ValidationError } = require("../utils/errors");
const logger = require("../utils/logger");

class StatementService {
  /**
   * Process uploaded statement
   * @param {Object} file - Multer file object
   * @param {String} userId - User ID
   * @param {String} groupId - Optional group ID
   * @returns {Object} Statement and transactions
   */
  async processStatement(file, userId, groupId = null) {
    let statement = null;

    try {
      // Step 1: Calculate file hash for duplicate detection
      const fileHash = calculateFileHash(file.buffer);
      logger.info({ fileHash, userId }, "Processing statement upload");

      // Step 2: Check for duplicates
      const existingStatement = await statementRepository.findByHash(
        fileHash,
        userId
      );
      if (existingStatement) {
        throw new ConflictError(
          "This statement has already been uploaded. " +
            `Uploaded on ${existingStatement.uploadedAt.toDateString()}`
        );
      }

      // Step 3: Create initial statement record
      statement = await statementRepository.create({
        userId,
        groupId,
        fileName: file.originalname,
        fileSize: file.size,
        fileHash,
        status: "parsing",
        uploadContext: groupId ? "group_review" : "personal",
      });

      // Step 4: Parse PDF
      const { bankName, transactions, statementPeriod } =
        await parserService.parsePDF(file.buffer);

      // Step 5: Auto-detect group expenses if uploading to group
      const analyzedTransactions =
        await groupExpenseDetector.detectGroupExpenses(transactions, groupId);

      // Step 6: Categorize transactions (NEW - Day 4)
      logger.info(
        { count: analyzedTransactions.length },
        "Starting transaction categorization"
      );

      const categorizedTransactions =
        await categorizationService.categorizeBatch(
          analyzedTransactions,
          userId
        );

      logger.info(
        {
          total: categorizedTransactions.length,
          categorized: categorizedTransactions.filter((t) => t.category).length,
          uncategorized: categorizedTransactions.filter((t) => !t.category)
            .length,
        },
        "Categorization completed"
      );

      // Step 7: Prepare transactions for insertion
      const transactionsToInsert = categorizedTransactions.map((txn) => ({
        ...txn,
        userId,
        groupId: groupId || null,
        statementId: statement._id,
        bankName,
      }));

      // Step 8: Insert transactions in bulk
      const insertedTransactions = await transactionRepository.bulkInsert(
        transactionsToInsert
      );

      // Step 9: Get detection summary
      const detectionSummary =
        groupExpenseDetector.getDetectionSummary(analyzedTransactions);

      // Step 10: Calculate categorization stats
      const categorizationStats = {
        total: categorizedTransactions.length,
        categorized: categorizedTransactions.filter((t) => t.category).length,
        uncategorized: categorizedTransactions.filter((t) => !t.category)
          .length,
        byMethod: {
          rule: categorizedTransactions.filter(
            (t) => t.categorizedBy === "rule"
          ).length,
          ai: categorizedTransactions.filter((t) => t.categorizedBy === "ai")
            .length,
          manual: 0,
        },
      };

      // Step 11: Update statement as completed
      await statementRepository.updateStatus(statement._id, "completed", {
        bankName,
        statementPeriod,
        transactionsCount: insertedTransactions.length,
        autoDetectionSummary: detectionSummary,
      });

      // Step 12: Trigger insight computation
      if (statementPeriod && statementPeriod.from) {
        const month = statementPeriod.from.toISOString().slice(0, 7);

        // Invalidate cache for this month
        insightService.invalidateInsights(userId, month).catch((err) => {
          logger.error(
            { error: err, userId, month },
            "Failed to invalidate insights cache"
          );
        });

        // Optional: Pre-compute insight in background
        insightService
          .computePersonalInsight(userId, month)
          .then((insight) => {
            const insightRepository = require("../repositories/insight.repository");
            return insightRepository.upsert(insight);
          })
          .catch((err) => {
            logger.error(
              { error: err, userId, month },
              "Failed to pre-compute insight"
            );
          });
      }

      logger.info(
        {
          statementId: statement._id,
          bankName,
          transactionCount: insertedTransactions.length,
          groupExpensesSuggested: detectionSummary.suggestedAsGroup,
          categorized: categorizationStats.categorized,
          uncategorized: categorizationStats.uncategorized,
          categorizationMethods: categorizationStats.byMethod,
        },
        "Statement processed successfully"
      );

      return {
        statement: {
          id: statement._id,
          fileName: file.originalname,
          bankName,
          transactionsCount: insertedTransactions.length,
          statementPeriod,
          uploadContext: statement.uploadContext,
          autoDetectionSummary: detectionSummary,
          categorizationStats, // NEW: Return categorization stats
        },
        transactions: insertedTransactions,
      };
    } catch (error) {
      // Update statement status to failed
      if (statement) {
        await statementRepository.updateStatus(statement._id, "failed", {
          errorMessage: error.message,
        });
      }

      logger.error({ error, userId, groupId }, "Statement processing failed");
      throw error;
    }
  }

  /**
   * Get user's statements
   */
  async getUserStatements(userId, limit = 50) {
    try {
      const statements = await statementRepository.findByUser(userId, limit);
      return statements;
    } catch (error) {
      logger.error({ error, userId }, "Failed to get user statements");
      throw error;
    }
  }

  /**
   * Get group's statements
   */
  async getGroupStatements(groupId, limit = 50) {
    try {
      const statements = await statementRepository.findByGroup(groupId, limit);
      return statements;
    } catch (error) {
      logger.error({ error, groupId }, "Failed to get group statements");
      throw error;
    }
  }

  /**
   * Delete statement and all its transactions
   */
  async deleteStatement(statementId, userId) {
    try {
      // Verify ownership
      const statement = await statementRepository.findById(statementId);
      if (!statement) {
        throw new ValidationError("Statement not found");
      }

      if (statement.userId.toString() !== userId.toString()) {
        throw new ValidationError("You can only delete your own statements");
      }

      // Delete transactions first
      await transactionRepository.deleteByStatement(statementId);

      // Delete statement
      await statementRepository.delete(statementId);

      logger.info(
        { statementId, userId },
        "Statement and transactions deleted"
      );

      return true;
    } catch (error) {
      logger.error({ error, statementId }, "Failed to delete statement");
      throw error;
    }
  }

  /**
   * Confirm group expenses (user approves auto-detected ones)
   */
  async confirmGroupExpenses(statementId, transactionIds, userId) {
    try {
      const statement = await statementRepository.findById(statementId);

      if (!statement) {
        throw new ValidationError("Statement not found");
      }

      if (statement.userId.toString() !== userId.toString()) {
        throw new ValidationError("You can only modify your own transactions");
      }

      // Mark selected transactions as confirmed group expenses
      const count = await transactionRepository.markAsGroupExpenses(
        transactionIds,
        statement.groupId,
        userId
      );

      // Update statement summary
      await statementRepository.updateStatus(statementId, statement.status, {
        "autoDetectionSummary.confirmedAsGroup": count,
      });

      logger.info({ statementId, count }, "Group expenses confirmed");

      return { confirmedCount: count };
    } catch (error) {
      logger.error({ error, statementId }, "Failed to confirm group expenses");
      throw error;
    }
  }
}

module.exports = new StatementService();
// const parserService = require("../parsers");
// const groupExpenseDetector = require("./groupExpenseDetector.service");
// const statementRepository = require("../repositories/statement.repository");
// const transactionRepository = require("../repositories/transaction.repository");
// const { calculateFileHash } = require("../utils/helpers");
// const { ConflictError, ValidationError } = require("../utils/errors");
// const logger = require("../utils/logger");

// class StatementService {
//   /**
//    * Process uploaded statement
//    * @param {Object} file - Multer file object
//    * @param {String} userId - User ID
//    * @param {String} groupId - Optional group ID
//    * @returns {Object} Statement and transactions
//    */
//   async processStatement(file, userId, groupId = null) {
//     let statement = null;

//     try {
//       // Step 1: Calculate file hash for duplicate detection
//       const fileHash = calculateFileHash(file.buffer);
//       logger.info({ fileHash, userId }, "Processing statement upload");

//       // Step 2: Check for duplicates
//       const existingStatement = await statementRepository.findByHash(
//         fileHash,
//         userId
//       );
//       if (existingStatement) {
//         throw new ConflictError(
//           "This statement has already been uploaded. " +
//             `Uploaded on ${existingStatement.uploadedAt.toDateString()}`
//         );
//       }

//       // Step 3: Create initial statement record
//       statement = await statementRepository.create({
//         userId,
//         groupId,
//         fileName: file.originalname,
//         fileSize: file.size,
//         fileHash,
//         status: "parsing",
//         uploadContext: groupId ? "group_review" : "personal",
//       });

//       // Step 4: Parse PDF
//       const { bankName, transactions, statementPeriod } =
//         await parserService.parsePDF(file.buffer);

//       // Step 5: Auto-detect group expenses if uploading to group
//       const analyzedTransactions =
//         await groupExpenseDetector.detectGroupExpenses(transactions, groupId);

//       // Step 6: Prepare transactions for insertion
//       const transactionsToInsert = analyzedTransactions.map((txn) => ({
//         ...txn,
//         userId,
//         groupId: groupId || null,
//         statementId: statement._id,
//         bankName,
//       }));

//       // Step 7: Insert transactions in bulk
//       const insertedTransactions = await transactionRepository.bulkInsert(
//         transactionsToInsert
//       );

//       // Step 8: Get detection summary
//       const detectionSummary =
//         groupExpenseDetector.getDetectionSummary(analyzedTransactions);

//       // Step 9: Update statement as completed
//       await statementRepository.updateStatus(statement._id, "completed", {
//         bankName,
//         statementPeriod,
//         transactionsCount: insertedTransactions.length,
//         autoDetectionSummary: detectionSummary,
//       });

//       logger.info(
//         {
//           statementId: statement._id,
//           bankName,
//           transactionCount: insertedTransactions.length,
//           groupExpensesSuggested: detectionSummary.suggestedAsGroup,
//         },
//         "Statement processed successfully"
//       );

//       return {
//         statement: {
//           id: statement._id,
//           fileName: file.originalname,
//           bankName,
//           transactionsCount: insertedTransactions.length,
//           statementPeriod,
//           uploadContext: statement.uploadContext,
//           autoDetectionSummary: detectionSummary,
//         },
//         transactions: insertedTransactions,
//       };
//     } catch (error) {
//       // Update statement status to failed
//       if (statement) {
//         await statementRepository.updateStatus(statement._id, "failed", {
//           errorMessage: error.message,
//         });
//       }

//       logger.error({ error, userId, groupId }, "Statement processing failed");
//       throw error;
//     }
//   }

//   /**
//    * Get user's statements
//    */
//   async getUserStatements(userId, limit = 50) {
//     try {
//       const statements = await statementRepository.findByUser(userId, limit);
//       return statements;
//     } catch (error) {
//       logger.error({ error, userId }, "Failed to get user statements");
//       throw error;
//     }
//   }

//   /**
//    * Get group's statements
//    */
//   async getGroupStatements(groupId, limit = 50) {
//     try {
//       const statements = await statementRepository.findByGroup(groupId, limit);
//       return statements;
//     } catch (error) {
//       logger.error({ error, groupId }, "Failed to get group statements");
//       throw error;
//     }
//   }

//   /**
//    * Delete statement and all its transactions
//    */
//   async deleteStatement(statementId, userId) {
//     try {
//       // Verify ownership
//       const statement = await statementRepository.findById(statementId);
//       if (!statement) {
//         throw new ValidationError("Statement not found");
//       }

//       if (statement.userId.toString() !== userId.toString()) {
//         throw new ValidationError("You can only delete your own statements");
//       }

//       // Delete transactions first
//       await transactionRepository.deleteByStatement(statementId);

//       // Delete statement
//       await statementRepository.delete(statementId);

//       logger.info(
//         { statementId, userId },
//         "Statement and transactions deleted"
//       );

//       return true;
//     } catch (error) {
//       logger.error({ error, statementId }, "Failed to delete statement");
//       throw error;
//     }
//   }

//   /**
//    * Confirm group expenses (user approves auto-detected ones)
//    */
//   async confirmGroupExpenses(statementId, transactionIds, userId) {
//     try {
//       const statement = await statementRepository.findById(statementId);

//       if (!statement) {
//         throw new ValidationError("Statement not found");
//       }

//       if (statement.userId.toString() !== userId.toString()) {
//         throw new ValidationError("You can only modify your own transactions");
//       }

//       // Mark selected transactions as confirmed group expenses
//       const count = await transactionRepository.markAsGroupExpenses(
//         transactionIds,
//         statement.groupId,
//         userId
//       );

//       // Update statement summary
//       await statementRepository.updateStatus(statementId, statement.status, {
//         "autoDetectionSummary.confirmedAsGroup": count,
//       });

//       logger.info({ statementId, count }, "Group expenses confirmed");

//       return { confirmedCount: count };
//     } catch (error) {
//       logger.error({ error, statementId }, "Failed to confirm group expenses");
//       throw error;
//     }
//   }
// }

// module.exports = new StatementService();
