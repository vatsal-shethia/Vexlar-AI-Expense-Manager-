const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: "📁",
    },
    color: {
      type: String,
      default: "#6B7280",
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    keywords: [
      {
        type: String,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
categorySchema.index({ userId: 1 });
categorySchema.index({ isSystem: 1 });
categorySchema.index({ name: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
