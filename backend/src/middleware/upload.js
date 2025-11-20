const multer = require("multer");
const { ValidationError } = require("../utils/errors");
const logger = require("../utils/logger");

// Memory storage (process immediately, don't save)
const storage = multer.memoryStorage();

// File filter - only PDFs
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["application/pdf"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError("Only PDF files are allowed"), false);
  }
};

// Upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 1, // Only 1 file at a time
  },
});

// Error handler for multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new ValidationError("File size exceeds 10MB limit"));
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return next(new ValidationError("Only one file allowed per upload"));
    }
    return next(new ValidationError(`Upload error: ${err.message}`));
  }
  next(err);
};

// Middleware to log upload stats
const logUploadStats = (req, res, next) => {
  if (req.file) {
    logger.info(
      {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
      "File uploaded to memory"
    );
  }
  next();
};

module.exports = {
  upload,
  handleUploadError,
  logUploadStats,
};

// const multer = require("multer");
// const path = require("path");
// const { ValidationError } = require("../utils/errors");

// // Memory storage (we'll process immediately, not save to disk)
// const storage = multer.memoryStorage();

// // File filter - only PDFs
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ["application/pdf"];

//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new ValidationError("Only PDF files are allowed"), false);
//   }
// };

// // Upload configuration
// const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB max
//   },
// });

// // Error handler for multer errors
// const handleUploadError = (err, req, res, next) => {
//   if (err instanceof multer.MulterError) {
//     if (err.code === "LIMIT_FILE_SIZE") {
//       return next(new ValidationError("File size exceeds 10MB limit"));
//     }
//     return next(new ValidationError(`Upload error: ${err.message}`));
//   }
//   next(err);
// };

// module.exports = {
//   upload,
//   handleUploadError,
// };
