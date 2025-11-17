const mongoose = require("mongoose");

const chatHistorySchema = new mongoose.Schema(
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
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    messages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant"],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        retrievedDocuments: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Embedding",
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes
chatHistorySchema.index({ userId: 1, groupId: 1, sessionId: 1 });
chatHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatHistory", chatHistorySchema);
