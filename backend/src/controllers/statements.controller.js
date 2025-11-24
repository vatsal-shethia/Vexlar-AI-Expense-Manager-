const statementService = require("../services/statement.service");
const parserService = require("../parsers"); // ← Make sure this line exists
const { ValidationError } = require("../utils/errors");
const logger = require("../utils/logger");

class StatementsController {
  /**
   * Upload and process a bank statement
   * POST /api/statements/upload
   */
  async uploadStatement(req, res, next) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        throw new ValidationError(
          "No file uploaded. Please upload a PDF file."
        );
      }

      const userId = req.auth.userId;
      const { groupId } = req.body;

      logger.info(
        {
          userId,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          groupId: groupId || "personal",
        },
        "Statement upload request received"
      );

      // Process the statement
      const result = await statementService.processStatement(
        req.file,
        userId,
        groupId || null
      );

      res.status(201).json({
        success: true,
        message: "Statement processed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's uploaded statements
   * GET /api/statements
   */
  async getStatements(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { limit = 50 } = req.query;

      const statements = await statementService.getUserStatements(
        userId,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: {
          statements,
          count: statements.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get statements for a specific group
   * GET /api/statements/group/:groupId
   */
  async getGroupStatements(req, res, next) {
    try {
      const { groupId } = req.params;
      const { limit = 50 } = req.query;

      // TODO: Add authorization check (user must be member of group)

      const statements = await statementService.getGroupStatements(
        groupId,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: {
          statements,
          count: statements.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a statement and all its transactions
   * DELETE /api/statements/:id
   */
  async deleteStatement(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;

      await statementService.deleteStatement(id, userId);

      res.json({
        success: true,
        message:
          "Statement and all associated transactions deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm which transactions are group expenses
   * POST /api/statements/:id/confirm-group-expenses
   */
  async confirmGroupExpenses(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const { transactionIds } = req.body;

      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        throw new ValidationError("transactionIds must be a non-empty array");
      }

      const result = await statementService.confirmGroupExpenses(
        id,
        transactionIds,
        userId
      );

      res.json({
        success: true,
        message: `${result.confirmedCount} transactions confirmed as group expenses`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supported banks
   * GET /api/statements/supported-banks
   */
  async getSupportedBanks(req, res, next) {
    try {
      const banks = parserService.getSupportedBanks();

      res.json({
        success: true,
        data: {
          banks,
          count: banks.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StatementsController();
// const statementService = require("../services/statement.service");
// const { ValidationError } = require("../utils/errors");
// const logger = require("../utils/logger");

// class StatementsController {
//   /**
//    * Upload and process a bank statement
//    * POST /api/statements/upload
//    */
//   async uploadStatement(req, res, next) {
//     try {
//       // Check if file was uploaded
//       if (!req.file) {
//         throw new ValidationError(
//           "No file uploaded. Please upload a PDF file."
//         );
//       }

//       const userId = req.auth.userId;
//       const { groupId } = req.body;

//       logger.info(
//         {
//           userId,
//           fileName: req.file.originalname,
//           fileSize: req.file.size,
//           groupId: groupId || "personal",
//         },
//         "Statement upload request received"
//       );

//       // Process the statement
//       const result = await statementService.processStatement(
//         req.file,
//         userId,
//         groupId || null
//       );

//       res.status(201).json({
//         success: true,
//         message: "Statement processed successfully",
//         data: result,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * Get user's uploaded statements
//    * GET /api/statements
//    */
//   async getStatements(req, res, next) {
//     try {
//       const userId = req.auth.userId;
//       const { limit = 50 } = req.query;

//       const statements = await statementService.getUserStatements(
//         userId,
//         parseInt(limit)
//       );

//       res.json({
//         success: true,
//         data: {
//           statements,
//           count: statements.length,
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * Get statements for a specific group
//    * GET /api/statements/group/:groupId
//    */
//   async getGroupStatements(req, res, next) {
//     try {
//       const { groupId } = req.params;
//       const { limit = 50 } = req.query;

//       // TODO: Add authorization check (user must be member of group)

//       const statements = await statementService.getGroupStatements(
//         groupId,
//         parseInt(limit)
//       );

//       res.json({
//         success: true,
//         data: {
//           statements,
//           count: statements.length,
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * Delete a statement and all its transactions
//    * DELETE /api/statements/:id
//    */
//   async deleteStatement(req, res, next) {
//     try {
//       const { id } = req.params;
//       const userId = req.auth.userId;

//       await statementService.deleteStatement(id, userId);

//       res.json({
//         success: true,
//         message:
//           "Statement and all associated transactions deleted successfully",
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * Confirm which transactions are group expenses
//    * POST /api/statements/:id/confirm-group-expenses
//    */
//   async confirmGroupExpenses(req, res, next) {
//     try {
//       const { id } = req.params;
//       const userId = req.auth.userId;
//       const { transactionIds } = req.body;

//       if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
//         throw new ValidationError("transactionIds must be a non-empty array");
//       }

//       const result = await statementService.confirmGroupExpenses(
//         id,
//         transactionIds,
//         userId
//       );

//       res.json({
//         success: true,
//         message: `${result.confirmedCount} transactions confirmed as group expenses`,
//         data: result,
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * Get supported banks
//    * GET /api/statements/supported-banks
//    */
//   async getSupportedBanks(req, res, next) {
//     try {
//       const parserService = require("../parsers");
//       const banks = parserService.getSupportedBanks();

//       res.json({
//         success: true,
//         data: {
//           banks,
//           count: banks.length,
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
// }

// module.exports = new StatementsController();
