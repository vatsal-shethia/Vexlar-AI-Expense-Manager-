const express = require("express");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const { userSchemas } = require("../utils/validators");

const router = express.Router();

// Sync user from Clerk to our database
router.post(
  "/sync",
  validate(userSchemas.syncProfile),
  authController.syncUser
);

// Get current user profile
router.get("/me", requireAuth, authController.getProfile);

// Update user profile
router.patch("/me", requireAuth, authController.updateProfile);

module.exports = router;
