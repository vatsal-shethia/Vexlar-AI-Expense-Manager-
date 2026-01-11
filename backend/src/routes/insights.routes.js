const express = require("express");
const router = express.Router();
const insightsController = require("../controllers/insights.controller");
const { requireAuth } = require("../middleware/auth");

/**
 * All routes require authentication
 */
router.use(requireAuth);

/**
 * @route   GET /api/insights/personal
 * @desc    Get personal insight for a month
 * @query   month (YYYY-MM)
 * @access  Private
 */
router.get("/personal", insightsController.getPersonalInsight);

/**
 * @route   GET /api/insights/personal/trends
 * @desc    Get personal trends (multi-month)
 * @query   months (default: 3)
 * @access  Private
 */
router.get("/personal/trends", insightsController.getPersonalTrends);

/**
 * @route   GET /api/insights/available-months
 * @desc    Get list of months with computed insights
 * @query   type (personal|group, default: personal)
 * @access  Private
 */
router.get("/available-months", insightsController.getAvailableMonths);

/**
 * @route   POST /api/insights/recompute
 * @desc    Force recompute insight (debug/admin)
 * @body    { month, type, groupId? }
 * @access  Private
 */
router.post("/recompute", insightsController.recomputeInsight);

/**
 * @route   GET /api/insights/group/:groupId
 * @desc    Get group insight for a month
 * @query   month (YYYY-MM)
 * @access  Private
 */
router.get("/group/:groupId", insightsController.getGroupInsight);

/**
 * @route   GET /api/insights/group/:groupId/breakdown
 * @desc    Get group member breakdown
 * @query   month (YYYY-MM)
 * @access  Private
 */
router.get("/group/:groupId/breakdown", insightsController.getGroupBreakdown);

/**
 * @route   GET /api/insights/group/:groupId/trends
 * @desc    Get group trends (multi-month)
 * @query   months (default: 3)
 * @access  Private
 */
router.get("/group/:groupId/trends", insightsController.getGroupTrends);

module.exports = router;
