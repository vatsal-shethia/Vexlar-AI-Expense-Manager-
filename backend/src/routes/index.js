const express = require("express");
const authRoutes = require("./auth.routes");
const transactionRoutes = require("./transactions.routes");
const insightRoutes = require("./insights.routes");
const groupRoutes = require("./groups.routes");
const statementRoutes = require("./statements.routes");
const aiRoutes = require("./ai.routes");

const router = express.Router();

// =============================================================================
// TEST UTILITIES (Development Only)
// =============================================================================
if (process.env.NODE_ENV === "development") {
  const User = require("../models/User");

  // Create test user
  router.post("/test/setup", async (req, res, next) => {
    try {
      const testUser = await User.findOneAndUpdate(
        { clerkId: "test_clerk_id" },
        {
          clerkId: "test_clerk_id",
          email: "test@vexlar.com",
          name: "Test User",
          profile: {
            monthlyIncome: 50000,
            currency: "INR",
          },
        },
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        message: "Test user created",
        data: {
          userId: testUser._id,
          email: testUser.email,
          note: "Use /test/ endpoints for testing without auth",
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // new block mock transaction

  // Create mock transactions for testing
  router.post("/test/mock-transactions", async (req, res, next) => {
    try {
      const Transaction = require("../models/Transaction");
      const Statement = require("../models/Statement");

      const testUser = await User.findOne({ clerkId: "test_clerk_id" });

      if (!testUser) {
        return res.status(400).json({
          success: false,
          error: "Run /test/setup first",
        });
      }

      // Create mock statement
      const statement = await Statement.create({
        userId: testUser._id,
        fileName: "mock_hdfc_statement.pdf",
        fileSize: 12345,
        fileHash: "mock_hash_" + Date.now(),
        bankName: "HDFC",
        status: "completed",
        transactionsCount: 5,
        uploadContext: "personal",
        statementPeriod: {
          from: new Date("2024-11-01"),
          to: new Date("2024-11-30"),
        },
      });

      // Create diverse mock transactions
      const mockTransactions = [
        {
          userId: testUser._id,
          statementId: statement._id,
          date: new Date("2024-11-01"),
          merchant: "Swiggy",
          rawDescription: "SWIGGY ONLINE FOOD ORDER",
          amount: -450,
          type: "debit",
          bankName: "HDFC",
          mode: "UPI",
          category: "FOOD",
        },
        {
          userId: testUser._id,
          statementId: statement._id,
          date: new Date("2024-11-05"),
          merchant: "Salary Credit",
          rawDescription: "SALARY FOR NOV 2024",
          amount: 50000,
          type: "credit",
          bankName: "HDFC",
          mode: "NEFT",
          category: "INCOME",
        },
        {
          userId: testUser._id,
          statementId: statement._id,
          date: new Date("2024-11-10"),
          merchant: "Amazon",
          rawDescription: "AMAZON PAY PURCHASE",
          amount: -1299,
          type: "debit",
          bankName: "HDFC",
          mode: "CARD",
          category: "SHOPPING",
        },
        {
          userId: testUser._id,
          statementId: statement._id,
          date: new Date("2024-11-15"),
          merchant: "BigBasket",
          rawDescription: "BIGBASKET GROCERIES",
          amount: -2100,
          type: "debit",
          bankName: "HDFC",
          mode: "UPI",
          category: "GROCERIES",
        },
        {
          userId: testUser._id,
          statementId: statement._id,
          date: new Date("2024-11-20"),
          merchant: "Uber",
          rawDescription: "UBER TRIP",
          amount: -350,
          type: "debit",
          bankName: "HDFC",
          mode: "UPI",
          category: "TRAVEL",
        },
      ];

      const transactions = await Transaction.insertMany(mockTransactions);

      res.json({
        success: true,
        message: "Mock data created successfully",
        data: {
          statement,
          transactions,
          count: transactions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  //new block /test/cleanup

  router.post("/test/cleanup", async (req, res, next) => {
    try {
      const Transaction = require("../models/Transaction");
      const Statement = require("../models/Statement");

      const testUser = await User.findOne({ clerkId: "test_clerk_id" });

      if (!testUser) {
        return res.json({ success: false, error: "Test user not found" });
      }

      const deletedTransactions = await Transaction.deleteMany({
        userId: testUser._id,
      });
      const deletedStatements = await Statement.deleteMany({
        userId: testUser._id,
      });

      res.json({
        success: true,
        message: "Test data cleaned up",
        data: {
          deletedTransactions: deletedTransactions.deletedCount,
          deletedStatements: deletedStatements.deletedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  });
}

//new test block
//NEW: Check database contents
router.get("/test/db-check", async (req, res, next) => {
  try {
    const User = require("../models/User");
    const Transaction = require("../models/Transaction");
    const Statement = require("../models/Statement");

    const testUser = await User.findOne({ clerkId: "test_clerk_id" });

    if (!testUser) {
      return res.json({ success: false, error: "Test user not found" });
    }

    const transactionCount = await Transaction.countDocuments({
      userId: testUser._id,
    });

    const statementCount = await Statement.countDocuments({
      userId: testUser._id,
    });

    const sampleTransactions = await Transaction.find({
      userId: testUser._id,
    })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        transactionCount,
        statementCount,
        sampleTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
});
//new block ends

// Test PDF reading directly
router.post(
  "/test/pdf-raw",
  require("../middleware/upload").upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.json({ error: "No file uploaded" });
      }

      const pdfParse = require("pdf-parse");
      const data = await pdfParse(req.file.buffer);

      res.json({
        success: true,
        data: {
          textLength: data.text.length,
          numpages: data.numpages,
          info: data.info,
          preview: data.text.substring(0, 500), // First 500 chars
        },
      });
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  }
);

//new test block
router.get("/test/statement-details", async (req, res, next) => {
  try {
    const User = require("../models/User");
    const Statement = require("../models/Statement");

    const testUser = await User.findOne({ clerkId: "test_clerk_id" });

    if (!testUser) {
      return res.json({ success: false, error: "Test user not found" });
    }

    const statements = await Statement.find({ userId: testUser._id })
      .sort({ uploadedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { statements },
    });
  } catch (error) {
    next(error);
  }
});
//new block ends
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Vexlar API",
  });
});

//Mount route modules
router.use("/auth", authRoutes);
router.use("/transactions", transactionRoutes);
router.use("/insights", insightRoutes);
router.use("/groups", groupRoutes);
router.use("/statements", statementRoutes);
router.use("/ai", aiRoutes);

module.exports = router;
// const express = require("express");
// const authRoutes = require("./auth.routes");
// const transactionRoutes = require("./transactions.routes");
// const insightRoutes = require("./insights.routes");
// const groupRoutes = require("./groups.routes");
// const statementRoutes = require("./statements.routes");
// const aiRoutes = require("./ai.routes");

// const router = express.Router();

// //new block
// if (process.env.NODE_ENV === "development") {
//   const User = require("../models/User");

//   // Create test user
//   router.post("/test/setup", async (req, res, next) => {
//     try {
//       const testUser = await User.findOneAndUpdate(
//         { clerkId: "test_clerk_id" },
//         {
//           clerkId: "test_clerk_id",
//           email: "test@vexlar.com",
//           name: "Test User",
//           profile: {
//             monthlyIncome: 50000,
//             currency: "INR",
//           },
//         },
//         { upsert: true, new: true }
//       );

//       res.json({
//         success: true,
//         message: "Test user created",
//         data: {
//           userId: testUser._id,
//           email: testUser.email,
//           note: "Use /test/ endpoints for testing without auth",
//         },
//       });
//     } catch (error) {
//       next(error);
//     }
//   });
// }
// //new block ends

// // Mount route modules
// router.use("/auth", authRoutes);
// router.use("/transactions", transactionRoutes);
// router.use("/insights", insightRoutes);
// router.use("/groups", groupRoutes);
// router.use("/statements", statementRoutes);
// router.use("/ai", aiRoutes);

// module.exports = router;
