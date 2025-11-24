const express = require("express");
const statementsController = require("../controllers/statements.controller");
const { requireAuth } = require("../middleware/auth");
const {
  upload,
  handleUploadError,
  logUploadStats,
} = require("../middleware/upload");

const router = express.Router();

// =============================================================================
// TEST ROUTES (No Auth) - REMOVE IN PRODUCTION
// =============================================================================
if (process.env.NODE_ENV === "development") {
  const User = require("../models/User");

  // Mock auth middleware for testing - fetches real user ID
  const mockAuth = async (req, res, next) => {
    try {
      // Find the test user we created
      const testUser = await User.findOne({ clerkId: "test_clerk_id" });

      if (!testUser) {
        return res.status(400).json({
          success: false,
          error: "Test user not found. Run POST /api/test/setup first",
        });
      }

      req.auth = {
        userId: testUser._id, // Use real ObjectId from DB
        clerkId: testUser.clerkId,
        email: testUser.email,
      };
      next();
    } catch (error) {
      next(error);
    }
  };

  // Test routes with mock auth
  router.get("/test/supported-banks", statementsController.getSupportedBanks);

  router.post(
    "/test/upload",
    mockAuth,
    upload.single("file"),
    handleUploadError,
    logUploadStats,
    statementsController.uploadStatement
  );

  router.get("/test/list", mockAuth, statementsController.getStatements);
}
// =============================================================================
// PRODUCTION ROUTES (With Auth)
// =============================================================================

// All production routes require authentication
router.use(requireAuth);

/**
 * @route   GET /api/statements/supported-banks
 * @desc    Get list of supported banks
 * @access  Private
 */
router.get("/supported-banks", statementsController.getSupportedBanks);

/**
 * @route   POST /api/statements/upload
 * @desc    Upload and process a bank statement PDF
 * @access  Private
 */
router.post(
  "/upload",
  upload.single("file"),
  handleUploadError,
  logUploadStats,
  statementsController.uploadStatement
);

/**
 * @route   GET /api/statements
 * @desc    Get user's uploaded statements
 * @access  Private
 */
router.get("/", statementsController.getStatements);

/**
 * @route   GET /api/statements/group/:groupId
 * @desc    Get statements for a specific group
 * @access  Private
 */
router.get("/group/:groupId", statementsController.getGroupStatements);

/**
 * @route   DELETE /api/statements/:id
 * @desc    Delete a statement and all its transactions
 * @access  Private
 */
router.delete("/:id", statementsController.deleteStatement);

/**
 * @route   POST /api/statements/:id/confirm-group-expenses
 * @desc    Confirm which transactions are group expenses
 * @access  Private
 */
router.post(
  "/:id/confirm-group-expenses",
  statementsController.confirmGroupExpenses
);

module.exports = router;

// const express = require("express");
// const statementsController = require("../controllers/statements.controller");
// const { requireAuth } = require("../middleware/auth");
// const {
//   upload,
//   handleUploadError,
//   logUploadStats,
// } = require("../middleware/upload");

// const router = express.Router();

// // All routes require authentication
// router.use(requireAuth);

// /**
//  * @route   GET /api/statements/supported-banks
//  * @desc    Get list of supported banks
//  * @access  Private
//  */
// router.get("/supported-banks", statementsController.getSupportedBanks);

// /**
//  * @route   POST /api/statements/upload
//  * @desc    Upload and process a bank statement PDF
//  * @access  Private
//  * @body    file (PDF), groupId (optional)
//  */
// router.post(
//   "/upload",
//   upload.single("file"), // Field name must be 'file'
//   handleUploadError,
//   logUploadStats,
//   statementsController.uploadStatement
// );

// /**
//  * @route   GET /api/statements
//  * @desc    Get user's uploaded statements
//  * @access  Private
//  */
// router.get("/", statementsController.getStatements);

// /**
//  * @route   GET /api/statements/group/:groupId
//  * @desc    Get statements for a specific group
//  * @access  Private
//  */
// router.get("/group/:groupId", statementsController.getGroupStatements);

// /**
//  * @route   DELETE /api/statements/:id
//  * @desc    Delete a statement and all its transactions
//  * @access  Private
//  */
// router.delete("/:id", statementsController.deleteStatement);

// /**
//  * @route   POST /api/statements/:id/confirm-group-expenses
//  * @desc    Confirm which transactions are group expenses
//  * @access  Private
//  * @body    transactionIds: [array of transaction IDs]
//  */
// router.post(
//   "/:id/confirm-group-expenses",
//   statementsController.confirmGroupExpenses
// );

// module.exports = router;
