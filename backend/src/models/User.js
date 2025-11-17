const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: "",
    },
    profile: {
      monthlyIncome: {
        type: Number,
        default: null,
      },
      currency: {
        type: String,
        default: "INR",
      },
      financialGoals: [
        {
          type: String,
        },
      ],
      riskLevel: {
        type: String,
        enum: ["conservative", "moderate", "aggressive"],
        default: "moderate",
      },
    },
    preferences: {
      defaultCategories: [
        {
          type: String,
        },
      ],
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        insights: {
          type: Boolean,
          default: true,
        },
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes
userSchema.index({ clerkId: 1 }, { unique: true });
userSchema.index({ email: 1 });

module.exports = mongoose.model("User", userSchema);
