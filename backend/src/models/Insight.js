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
      type: String, // Format: "YYYY-MM"
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    summary: {
      totalSpent: {
        type: Number,
        default: 0,
      },
      totalIncome: {
        type: Number,
        default: 0,
      },
      netSavings: {
        type: Number,
        default: 0,
      },
      transactionCount: {
        type: Number,
        default: 0,
      },
    },
    categoryBreakdown: [
      {
        category: String,
        amount: Number,
        percentage: Number,
        transactionCount: Number,
      },
    ],
    merchantBreakdown: [
      {
        merchant: String,
        amount: Number,
        transactionCount: Number,
        category: String,
      },
    ],
    trends: {
      monthOverMonth: Number, // % change
      categoryChanges: [
        {
          category: String,
          change: Number, // % change
          direction: {
            type: String,
            enum: ["up", "down", "stable"],
          },
        },
      ],
    },
    behavioralInsights: [
      {
        type: {
          type: String,
          enum: ["spike", "drop", "recurring", "unusual", "achievement"],
        },
        message: String,
        severity: {
          type: String,
          enum: ["info", "warning", "alert"],
        },
        data: mongoose.Schema.Types.Mixed,
      },
    ],
    computedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast cache lookups
insightSchema.index({ userId: 1, groupId: 1, month: 1 }, { unique: true });

// TTL index for auto-expiration
insightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Insight", insightSchema);
