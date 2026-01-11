const insightService = require("../services/insight.service");
const logger = require("../utils/logger");
const { ValidationError } = require("../utils/errors");

class InsightsController {
  /**
   * Get personal insight for a month
   * GET /api/insights/personal?month=2024-11
   */
  async getPersonalInsight(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { month } = req.query;

      // Validate month format
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new ValidationError("Month must be in YYYY-MM format");
      }

      const insight = await insightService.getPersonalInsight(userId, month);

      res.json({
        success: true,
        data: insight,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get personal trends (multi-month)
   * GET /api/insights/personal/trends?months=3
   */
  async getPersonalTrends(req, res, next) {
    try {
      const userId = req.auth.userId;
      const months = parseInt(req.query.months) || 3;

      if (months < 1 || months > 12) {
        throw new ValidationError("Months must be between 1 and 12");
      }

      const trends = await insightService.getTrends(userId, "personal", months);

      res.json({
        success: true,
        data: trends,
        count: trends.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get group insight for a month
   * GET /api/insights/group/:groupId?month=2024-11
   */
  async getGroupInsight(req, res, next) {
    try {
      const { groupId } = req.params;
      const { month } = req.query;

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new ValidationError("Month must be in YYYY-MM format");
      }

      const insight = await insightService.getGroupInsight(groupId, month);

      res.json({
        success: true,
        data: insight,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get group member breakdown
   * GET /api/insights/group/:groupId/breakdown?month=2024-11
   */
  async getGroupBreakdown(req, res, next) {
    try {
      const { groupId } = req.params;
      const { month } = req.query;

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new ValidationError("Month must be in YYYY-MM format");
      }

      const insight = await insightService.getGroupInsight(groupId, month);

      // Return only member breakdown
      res.json({
        success: true,
        data: {
          month,
          memberBreakdown: insight.groupData?.memberBreakdown || [],
          sharedCategories: insight.groupData?.sharedCategories || [],
          totalSpent: insight.summary.totalExpense,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get group trends
   * GET /api/insights/group/:groupId/trends?months=3
   */
  async getGroupTrends(req, res, next) {
    try {
      const { groupId } = req.params;
      const months = parseInt(req.query.months) || 3;

      if (months < 1 || months > 12) {
        throw new ValidationError("Months must be between 1 and 12");
      }

      // Get first member's userId from group (for trends query)
      // In production, you'd query Group model for any member
      const insight = await insightService.getGroupInsight(
        groupId,
        new Date().toISOString().slice(0, 7)
      );
      const userId = insight.userId;

      const trends = await insightService.getTrends(userId, "group", months);

      res.json({
        success: true,
        data: trends,
        count: trends.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Force recompute insight (admin/debug)
   * POST /api/insights/recompute
   */
  async recomputeInsight(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { month, type } = req.body;

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new ValidationError("Month must be in YYYY-MM format");
      }

      if (type !== "personal" && type !== "group") {
        throw new ValidationError("Type must be 'personal' or 'group'");
      }

      // Invalidate cache
      await insightService.invalidateInsights(userId, month);

      // Recompute
      let insight;
      if (type === "personal") {
        insight = await insightService.computePersonalInsight(userId, month);
      } else {
        const { groupId } = req.body;
        if (!groupId) {
          throw new ValidationError("groupId required for group type");
        }
        insight = await insightService.computeGroupInsight(groupId, month);
      }

      // Save
      const insightRepository = require("../repositories/insight.repository");
      await insightRepository.upsert(insight);

      logger.info({ userId, month, type }, "Insight recomputed");

      res.json({
        success: true,
        message: "Insight recomputed successfully",
        data: insight,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available months with insights
   * GET /api/insights/available-months
   */
  async getAvailableMonths(req, res, next) {
    try {
      const userId = req.auth.userId;
      const type = req.query.type || "personal";

      const insightRepository = require("../repositories/insight.repository");
      const months = await insightRepository.getAvailableMonths(userId, type);

      res.json({
        success: true,
        data: months,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InsightsController();
