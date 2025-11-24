const express = require("express");
const { requireAuth } = require("../middleware/auth");
const transactionRepository = require("../repositories/transaction.repository");

const router = express.Router();

// =============================================================================
// TEST ROUTES (No Auth) - REMOVE IN PRODUCTION
// =============================================================================
if (process.env.NODE_ENV === "development") {
  const User = require("../models/User");

  const mockAuth = async (req, res, next) => {
    try {
      const testUser = await User.findOne({ clerkId: "test_clerk_id" });

      if (!testUser) {
        return res.status(400).json({
          success: false,
          error: "Test user not found. Run POST /api/test/setup first",
        });
      }

      req.auth = { userId: testUser._id };
      next();
    } catch (error) {
      next(error);
    }
  };

  router.get("/test/list", mockAuth, async (req, res, next) => {
    try {
      const userId = req.auth.userId;
      const { groupId, limit } = req.query;

      const filters = {
        groupId: groupId === "null" ? null : groupId,
        limit: limit ? parseInt(limit) : 1000,
      };

      const transactions = await transactionRepository.findByUser(
        userId,
        filters
      );

      res.json({
        success: true,
        data: {
          transactions,
          count: transactions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });
}

// =============================================================================
// PRODUCTION ROUTES (With Auth)
// =============================================================================

// All production routes require authentication
router.use(requireAuth);

/**
 * @route   GET /api/transactions
 * @desc    Get user's transactions with filters
 * @access  Private
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { groupId, startDate, endDate, category, limit } = req.query;

    const filters = {
      groupId: groupId === "null" ? null : groupId,
      startDate,
      endDate,
      category,
      limit: limit ? parseInt(limit) : 1000,
    };

    const transactions = await transactionRepository.findByUser(
      userId,
      filters
    );

    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/transactions/share-with-group
 * @desc    Share selected transactions with a group
 * @access  Private
 */
router.post("/share-with-group", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { transactionIds, groupId } = req.body;

    if (!Array.isArray(transactionIds) || !groupId) {
      return res.status(400).json({
        success: false,
        error: "transactionIds (array) and groupId are required",
      });
    }

    const count = await transactionRepository.markAsGroupExpenses(
      transactionIds,
      groupId,
      userId
    );

    res.json({
      success: true,
      message: `${count} transactions shared with group`,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
// const express = require("express");
// const { requireAuth } = require("../middleware/auth");
// const transactionRepository = require("../repositories/transaction.repository");

// const router = express.Router();

// // All routes require authentication
// router.use(requireAuth);

// /**
//  * @route   GET /api/transactions
//  * @desc    Get user's transactions with filters
//  * @access  Private
//  */
// router.get("/", async (req, res, next) => {
//   try {
//     const userId = req.auth.userId;
//     const { groupId, startDate, endDate, category, limit } = req.query;

//     const filters = {
//       groupId: groupId === "null" ? null : groupId,
//       startDate,
//       endDate,
//       category,
//       limit: limit ? parseInt(limit) : 1000,
//     };

//     const transactions = await transactionRepository.findByUser(
//       userId,
//       filters
//     );

//     res.json({
//       success: true,
//       data: {
//         transactions,
//         count: transactions.length,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// /**
//  * @route   POST /api/transactions/share-with-group
//  * @desc    Share selected transactions with a group
//  * @access  Private
//  */
// router.post("/share-with-group", async (req, res, next) => {
//   try {
//     const userId = req.auth.userId;
//     const { transactionIds, groupId } = req.body;

//     if (!Array.isArray(transactionIds) || !groupId) {
//       return res.status(400).json({
//         success: false,
//         error: "transactionIds (array) and groupId are required",
//       });
//     }

//     const count = await transactionRepository.markAsGroupExpenses(
//       transactionIds,
//       groupId,
//       userId
//     );

//     res.json({
//       success: true,
//       message: `${count} transactions shared with group`,
//       data: { count },
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// module.exports = router;
