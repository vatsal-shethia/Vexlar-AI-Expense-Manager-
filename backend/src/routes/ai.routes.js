const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ success: true, message: "AI routes coming soon" });
});

module.exports = router;
