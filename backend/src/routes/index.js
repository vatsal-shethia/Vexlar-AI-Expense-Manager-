const express = require("express");
const authRoutes = require("./auth.routes");
const transactionRoutes = require("./transactions.routes");
const insightRoutes = require("./insights.routes");
const groupRoutes = require("./groups.routes");
const statementRoutes = require("./statements.routes");
const aiRoutes = require("./ai.routes");

const router = express.Router();

// Mount route modules
router.use("/auth", authRoutes);
router.use("/transactions", transactionRoutes);
router.use("/insights", insightRoutes);
router.use("/groups", groupRoutes);
router.use("/statements", statementRoutes);
router.use("/ai", aiRoutes);

module.exports = router;
