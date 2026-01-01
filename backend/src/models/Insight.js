const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },
    month: {
      type: String, // Format: "2024-11"
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["personal", "group"],
      required: true,
      index: true,
    },

    // Summary Statistics
    summary: {
      totalIncome: { type: Number, default: 0 },
      totalExpense: { type: Number, default: 0 },
      netSavings: { type: Number, default: 0 },
      transactionCount: { type: Number, default: 0 },
      avgTransactionAmount: { type: Number, default: 0 },
      largestTransaction: {
        amount: { type: Number, default: 0 },
        merchant: { type: String, default: null },
        category: { type: String, default: null },
      },
    },

    // Category Breakdown
    categoryBreakdown: [
      {
        category: { type: String, required: true },
        amount: { type: Number, required: true },
        percentage: { type: Number, required: true },
        transactionCount: { type: Number, required: true },
        avgAmount: { type: Number, required: true },
      },
    ],

    // Top Merchants
    topMerchants: [
      {
        merchant: { type: String, required: true },
        amount: { type: Number, required: true },
        transactionCount: { type: Number, required: true },
        category: { type: String, default: null },
      },
    ],

    // Behavioral Insights
    behavioralInsights: {
      spikes: [
        {
          category: String,
          currentAmount: Number,
          previousAmount: Number,
          percentageChange: Number,
          message: String,
        },
      ],
      drops: [
        {
          category: String,
          currentAmount: Number,
          previousAmount: Number,
          percentageChange: Number,
          message: String,
        },
      ],
      recurringExpenses: [
        {
          merchant: String,
          amount: Number,
          frequency: String, // "monthly", "weekly"
          category: String,
          lastDate: Date,
        },
      ],
      unusualTransactions: [
        {
          merchant: String,
          amount: Number,
          category: String,
          date: Date,
          reason: String, // "3x above average"
        },
      ],
    },

    // Month-over-Month Comparison
    trends: {
      incomeChange: { type: Number, default: 0 }, // Percentage
      expenseChange: { type: Number, default: 0 },
      savingsChange: { type: Number, default: 0 },
      categoryTrends: [
        {
          category: String,
          change: Number, // Percentage
          direction: String, // "up", "down", "stable"
        },
      ],
    },

    // Group-Specific Data (if type === "group")
    groupData: {
      memberBreakdown: [
        {
          userId: mongoose.Schema.Types.ObjectId,
          userName: String,
          totalSpent: Number,
          percentage: Number,
          transactionCount: Number,
        },
      ],
      sharedCategories: [
        {
          category: String,
          totalAmount: Number,
          splitAmount: Number, // Per person
          contributors: Number,
        },
      ],
    },

    computedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for Fast Queries
insightSchema.index({ userId: 1, month: 1, type: 1 }, { unique: true });
insightSchema.index({ groupId: 1, month: 1 });
insightSchema.index({ userId: 1, type: 1, createdAt: -1 });

// TTL Index: Auto-delete insights older than 90 days
insightSchema.index({ computedAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model("Insight", insightSchema);
// const mongoose = require("mongoose");

// const insightSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     groupId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Group",
//       default: null,
//       index: true,
//     },
//     month: {
//       type: String, // Format: "YYYY-MM"
//       required: true,
//     },
//     year: {
//       type: Number,
//       required: true,
//     },
//     summary: {
//       totalSpent: {
//         type: Number,
//         default: 0,
//       },
//       totalIncome: {
//         type: Number,
//         default: 0,
//       },
//       netSavings: {
//         type: Number,
//         default: 0,
//       },
//       transactionCount: {
//         type: Number,
//         default: 0,
//       },
//     },
//     categoryBreakdown: [
//       {
//         category: String,
//         amount: Number,
//         percentage: Number,
//         transactionCount: Number,
//       },
//     ],
//     merchantBreakdown: [
//       {
//         merchant: String,
//         amount: Number,
//         transactionCount: Number,
//         category: String,
//       },
//     ],
//     trends: {
//       monthOverMonth: Number, // % change
//       categoryChanges: [
//         {
//           category: String,
//           change: Number, // % change
//           direction: {
//             type: String,
//             enum: ["up", "down", "stable"],
//           },
//         },
//       ],
//     },
//     behavioralInsights: [
//       {
//         type: {
//           type: String,
//           enum: ["spike", "drop", "recurring", "unusual", "achievement"],
//         },
//         message: String,
//         severity: {
//           type: String,
//           enum: ["info", "warning", "alert"],
//         },
//         data: mongoose.Schema.Types.Mixed,
//       },
//     ],
//     computedAt: {
//       type: Date,
//       default: Date.now,
//     },
//     expiresAt: {
//       type: Date,
//       required: true,
//       index: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Compound index for fast cache lookups
// insightSchema.index({ userId: 1, groupId: 1, month: 1 }, { unique: true });

// // TTL index for auto-expiration
// insightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// module.exports = mongoose.model("Insight", insightSchema);
