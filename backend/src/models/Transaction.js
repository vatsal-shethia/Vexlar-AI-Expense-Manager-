const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: true,
      index: true,
    },
    merchant: {
      type: String,
      required: true,
      trim: true,
    },
    rawDescription: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["UPI", "CARD", "ATM", "NEFT", "IMPS", "CASH", "OTHER"],
      default: "OTHER",
    },
    balanceAfter: {
      type: Number,
      default: null,
    },
    category: {
      type: String,
      default: null,
      index: true,
    },
    categoryConfidence: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },
    categorizedBy: {
      type: String,
      enum: ["rule", "ai", "manual"],
      default: null,
    },
    categoryOverriddenAt: {
      type: Date,
      default: null,
    },
    statementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Statement",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes (CRITICAL - these drive all queries)
transactionSchema.index({ userId: 1, groupId: 1, date: -1 });
transactionSchema.index({ groupId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });
transactionSchema.index({ groupId: 1, category: 1, date: -1 });
transactionSchema.index({ merchant: 1 });

// Partial index for uncategorized transactions
transactionSchema.index(
  { userId: 1, category: 1 },
  {
    partialFilterExpression: { category: null },
    name: "uncategorized_transactions",
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
