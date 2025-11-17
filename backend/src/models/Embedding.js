const mongoose = require("mongoose");

const embeddingSchema = new mongoose.Schema(
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
    documentType: {
      type: String,
      enum: ["insight", "transaction_summary", "chat", "category_analysis"],
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    month: {
      type: String, // Format: "YYYY-MM"
      default: null,
    },
    category: {
      type: String,
      default: null,
    },
    tags: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
embeddingSchema.index({ userId: 1, groupId: 1, month: -1 });
embeddingSchema.index({ documentType: 1, documentId: 1 });

module.exports = mongoose.model("Embedding", embeddingSchema);
