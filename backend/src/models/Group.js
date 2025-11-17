const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    settings: {
      currency: {
        type: String,
        default: "INR",
      },
      sharedCategories: [
        {
          type: String,
        },
      ],
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
groupSchema.index({ createdBy: 1 });
groupSchema.index({ inviteCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Group", groupSchema);
