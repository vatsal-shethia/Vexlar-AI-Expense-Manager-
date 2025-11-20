const mongoose = require("mongoose");

const statementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    // NEW: Track how this statement was uploaded
    uploadContext: {
      type: String,
      enum: ["personal", "group_review"], // 'group_review' = uploaded with group filtering
      default: "personal",
    },

    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    fileHash: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      default: null,
    },
    statementPeriod: {
      from: {
        type: Date,
        default: null,
      },
      to: {
        type: Date,
        default: null,
      },
    },
    status: {
      type: String,
      enum: ["parsing", "completed", "failed"],
      default: "parsing",
    },
    transactionsCount: {
      type: Number,
      default: 0,
    },

    // NEW: Track auto-detection results
    autoDetectionSummary: {
      total: { type: Number, default: 0 },
      suggestedAsGroup: { type: Number, default: 0 },
      confirmedAsGroup: { type: Number, default: 0 },
    },

    errorMessage: {
      type: String,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
statementSchema.index({ userId: 1, uploadedAt: -1 });
statementSchema.index({ fileHash: 1 });
statementSchema.index({ groupId: 1, uploadedAt: -1 });

module.exports = mongoose.model("Statement", statementSchema);
// const mongoose = require("mongoose");

// const statementSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     groupId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Group",
//       default: null,
//       index: true,
//     },
//     fileName: {
//       type: String,
//       required: true,
//     },
//     fileSize: {
//       type: Number,
//       required: true,
//     },
//     fileHash: {
//       type: String,
//       required: true,
//       index: true,
//     },
//     bankName: {
//       type: String,
//       default: null,
//     },
//     statementPeriod: {
//       from: {
//         type: Date,
//         default: null,
//       },
//       to: {
//         type: Date,
//         default: null,
//       },
//     },
//     status: {
//       type: String,
//       enum: ["parsing", "completed", "failed"],
//       default: "parsing",
//     },
//     transactionsCount: {
//       type: Number,
//       default: 0,
//     },
//     errorMessage: {
//       type: String,
//       default: null,
//     },
//     uploadedAt: {
//       type: Date,
//       default: Date.now,
//     },
//     processedAt: {
//       type: Date,
//       default: null,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Indexes
// statementSchema.index({ userId: 1, uploadedAt: -1 });
// statementSchema.index({ fileHash: 1 });
// statementSchema.index({ groupId: 1, uploadedAt: -1 });

// module.exports = mongoose.model("Statement", statementSchema);
