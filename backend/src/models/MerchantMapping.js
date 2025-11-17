const mongoose = require("mongoose");

const merchantMappingSchema = new mongoose.Schema(
  {
    merchant: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      uppercase: true,
    },
    confidence: {
      type: Number,
      default: 1.0,
      min: 0,
      max: 1,
    },
    timesMatched: {
      type: Number,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
merchantMappingSchema.index({ merchant: 1, userId: 1 });
merchantMappingSchema.index({ userId: 1 });

module.exports = mongoose.model("MerchantMapping", merchantMappingSchema);
