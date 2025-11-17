const express = require("express");
const router = express.Router();

// Placeholder - we'll build these on Day 3-4
router.get("/", (req, res) => {
  res.json({ success: true, message: "Transactions routes coming soon" });
});

module.exports = router;
