// const mongoose = require("mongoose");

// const groupSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       maxlength: 100,
//     },
//     description: {
//       type: String,
//       default: "",
//       maxlength: 500,
//     },
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     settings: {
//       currency: {
//         type: String,
//         default: "INR",
//       },
//       sharedCategories: [
//         {
//           type: String,
//         },
//       ],
//     },
//     inviteCode: {
//       type: String,
//       unique: true,
//       sparse: true, // Allows multiple null values
//       index: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Indexes
// groupSchema.index({ createdBy: 1 });
// groupSchema.index({ inviteCode: 1 }, { unique: true, sparse: true });

// module.exports = mongoose.model("Group", groupSchema);

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

      // NEW: Auto-detection settings for group expenses
      autoDetectSettings: {
        // Categories that are usually group expenses
        groupCategories: [
          {
            type: String,
            default: [],
          },
        ],

        // Merchants that are usually group expenses
        groupMerchants: [
          {
            type: String,
            lowercase: true,
          },
        ],

        // Keywords in descriptions
        groupKeywords: [
          {
            type: String,
            lowercase: true,
          },
        ],
      },
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
groupSchema.index({ createdBy: 1 });
groupSchema.index({ inviteCode: 1 });

// Default group expense categories
groupSchema.pre("save", function (next) {
  if (this.isNew && !this.settings.autoDetectSettings.groupCategories.length) {
    this.settings.autoDetectSettings.groupCategories = [
      "GROCERIES",
      "UTILITIES",
      "RENT",
      "HOUSEHOLD",
      "BILLS",
    ];

    this.settings.autoDetectSettings.groupKeywords = [
      "electricity",
      "water",
      "gas",
      "rent",
      "maintenance",
    ];
  }
  next();
});

module.exports = mongoose.model("Group", groupSchema);
