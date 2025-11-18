const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      // Remove unique: true from here
    },
    email: {
      type: String,
      required: true,
      // No index: true here either
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
    timestamps: true,
  }
);

// All indexes defined explicitly here - cleaner and easier to see!
userSchema.index({ clerkId: 1 }, { unique: true });
userSchema.index({ email: 1 });

module.exports = mongoose.model("User", userSchema);
