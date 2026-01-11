const Transaction = require("../models/Transaction");
const insightRepository = require("../repositories/insight.repository");
const cache = require("../utils/cache");
const logger = require("../utils/logger");

class InsightService {
  /**
   * Get personal insight (cache-first)
   * @param {String} userId - User ID
   * @param {String} month - Month (YYYY-MM)
   * @returns {Object} Insight data
   */
  async getPersonalInsight(userId, month) {
    try {
      // Step 1: Check cache
      const cached = await cache.getInsight(userId, month, "personal");
      if (cached) {
        logger.debug({ userId, month }, "Insight cache hit");
        return cached;
      }

      // Step 2: Check database
      const stored = await insightRepository.findByUserAndMonth(
        userId,
        month,
        "personal"
      );
      if (stored) {
        // Cache for future requests
        await cache.setInsight(userId, month, "personal", stored);
        logger.debug({ userId, month }, "Insight from database");
        return stored;
      }

      // Step 3: Compute fresh
      logger.info({ userId, month }, "Computing fresh insight");
      const insight = await this.computePersonalInsight(userId, month);

      // Step 4: Save to database
      await insightRepository.upsert(insight);

      // Step 5: Cache
      await cache.setInsight(userId, month, "personal", insight);

      return insight;
    } catch (error) {
      logger.error({ error, userId, month }, "Failed to get personal insight");
      throw error;
    }
  }

  /**
   * Get group insight (cache-first)
   * @param {String} groupId - Group ID
   * @param {String} month - Month (YYYY-MM)
   * @returns {Object} Insight data
   */
  async getGroupInsight(groupId, month) {
    try {
      // Cache-first pattern
      const cached = await cache.getGroupInsight(groupId, month);
      if (cached) {
        logger.debug({ groupId, month }, "Group insight cache hit");
        return cached;
      }

      const stored = await insightRepository.findByGroupAndMonth(
        groupId,
        month
      );
      if (stored) {
        await cache.setGroupInsight(groupId, month, stored);
        return stored;
      }

      // Compute fresh
      logger.info({ groupId, month }, "Computing fresh group insight");
      const insight = await this.computeGroupInsight(groupId, month);

      await insightRepository.upsert(insight);
      await cache.setGroupInsight(groupId, month, insight);

      return insight;
    } catch (error) {
      logger.error({ error, groupId, month }, "Failed to get group insight");
      throw error;
    }
  }

  /**
   * Compute personal insight from transactions
   * @param {String} userId - User ID
   * @param {String} month - Month (YYYY-MM)
   * @returns {Object} Computed insight
   */
  async computePersonalInsight(userId, month) {
    try {
      // Get all transactions for the month
      const startDate = new Date(`${month}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const transactions = await Transaction.find({
        userId,
        groupId: null, // Personal only (not shared)
        date: { $gte: startDate, $lt: endDate },
      }).lean();

      if (transactions.length === 0) {
        return this._getEmptyInsight(userId, month, "personal");
      }

      // Compute all components
      const summary = this._computeSummary(transactions);
      const categoryBreakdown = this._computeCategoryBreakdown(transactions);
      const topMerchants = this._computeTopMerchants(transactions);

      // Get previous month for trends
      const prevMonth = this._getPreviousMonth(month);
      const prevInsight = await insightRepository.findByUserAndMonth(
        userId,
        prevMonth,
        "personal"
      );

      const trends = this._computeTrends(
        summary,
        categoryBreakdown,
        prevInsight
      );
      const behavioralInsights = await this._detectBehavioralInsights(
        transactions,
        categoryBreakdown,
        prevInsight
      );

      return {
        userId,
        groupId: null,
        month,
        type: "personal",
        summary,
        categoryBreakdown,
        topMerchants,
        behavioralInsights,
        trends,
        computedAt: new Date(),
      };
    } catch (error) {
      logger.error({ error, userId, month }, "Failed to compute insight");
      throw error;
    }
  }

  /**
   * Compute group insight from all member transactions
   * @param {String} groupId - Group ID
   * @param {String} month - Month (YYYY-MM)
   * @returns {Object} Computed insight
   */
  async computeGroupInsight(groupId, month) {
    try {
      const startDate = new Date(`${month}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      // Get all group transactions (isGroupExpense = true)
      const transactions = await Transaction.find({
        groupId,
        isGroupExpense: true,
        date: { $gte: startDate, $lt: endDate },
      })
        .populate("userId", "name email")
        .lean();

      if (transactions.length === 0) {
        return this._getEmptyInsight(null, month, "group", groupId);
      }

      // Basic aggregations
      const summary = this._computeSummary(transactions);
      const categoryBreakdown = this._computeCategoryBreakdown(transactions);
      const topMerchants = this._computeTopMerchants(transactions);

      // Group-specific: Member breakdown
      const memberBreakdown = this._computeMemberBreakdown(transactions);
      const sharedCategories = this._computeSharedCategories(
        transactions,
        memberBreakdown.length
      );

      // Trends
      const prevMonth = this._getPreviousMonth(month);
      const prevInsight = await insightRepository.findByGroupAndMonth(
        groupId,
        prevMonth
      );
      const trends = this._computeTrends(
        summary,
        categoryBreakdown,
        prevInsight
      );

      return {
        userId: transactions[0]?.userId?._id || null, // First member (arbitrary)
        groupId,
        month,
        type: "group",
        summary,
        categoryBreakdown,
        topMerchants,
        behavioralInsights: {
          spikes: [],
          drops: [],
          recurringExpenses: [],
          unusualTransactions: [],
        },
        trends,
        groupData: {
          memberBreakdown,
          sharedCategories,
        },
        computedAt: new Date(),
      };
    } catch (error) {
      logger.error(
        { error, groupId, month },
        "Failed to compute group insight"
      );
      throw error;
    }
  }

  /**
   * Get multi-month trends
   * @param {String} userId - User ID
   * @param {String} type - "personal" or "group"
   * @param {Number} months - Number of months
   * @returns {Array} Trend data
   */
  async getTrends(userId, type = "personal", months = 3) {
    try {
      // Check cache
      const cached = await cache.getTrends(userId, type, months);
      if (cached) {
        return cached;
      }

      // Fetch from database
      const insights = await insightRepository.findForTrends(
        userId,
        type,
        months
      );

      // Format for trends
      const trends = insights.map((insight) => ({
        month: insight.month,
        totalIncome: insight.summary.totalIncome,
        totalExpense: insight.summary.totalExpense,
        netSavings: insight.summary.netSavings,
        categoryBreakdown: insight.categoryBreakdown,
        trends: insight.trends,
      }));

      // Cache
      await cache.setTrends(userId, type, months, trends);

      return trends;
    } catch (error) {
      logger.error({ error, userId, months }, "Failed to get trends");
      throw error;
    }
  }

  // ==========================================================================
  // COMPUTATION HELPERS
  // ==========================================================================

  /**
   * Compute summary statistics
   * @private
   */
  _computeSummary(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;
    let largestTransaction = { amount: 0 };

    for (const txn of transactions) {
      if (txn.type === "credit" && txn.category === "INCOME") {
        totalIncome += Math.abs(txn.amount);
      } else if (txn.type === "debit") {
        totalExpense += Math.abs(txn.amount);
      }

      // Track largest
      if (Math.abs(txn.amount) > largestTransaction.amount) {
        largestTransaction = {
          amount: Math.abs(txn.amount),
          merchant: txn.merchant,
          category: txn.category,
        };
      }
    }

    const netSavings = totalIncome - totalExpense;
    const avgTransactionAmount =
      transactions.length > 0
        ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) /
          transactions.length
        : 0;

    return {
      totalIncome,
      totalExpense,
      netSavings,
      transactionCount: transactions.length,
      avgTransactionAmount,
      largestTransaction,
    };
  }

  /**
   * Compute category breakdown
   * @private
   */
  _computeCategoryBreakdown(transactions) {
    const categoryMap = {};

    // Aggregate by category
    for (const txn of transactions) {
      const category = txn.category || "OTHER";
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          amount: 0,
          transactionCount: 0,
          transactions: [],
        };
      }

      categoryMap[category].amount += Math.abs(txn.amount);
      categoryMap[category].transactionCount++;
      categoryMap[category].transactions.push(Math.abs(txn.amount));
    }

    // Calculate percentages and averages
    const totalAmount = Object.values(categoryMap).reduce(
      (sum, cat) => sum + cat.amount,
      0
    );

    const breakdown = Object.values(categoryMap).map((cat) => ({
      category: cat.category,
      amount: cat.amount,
      percentage: totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0,
      transactionCount: cat.transactionCount,
      avgAmount:
        cat.transactionCount > 0 ? cat.amount / cat.transactionCount : 0,
    }));

    // Sort by amount descending
    return breakdown.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Compute top merchants
   * @private
   */
  _computeTopMerchants(transactions) {
    const merchantMap = {};

    for (const txn of transactions) {
      const merchant = txn.merchant;
      if (!merchantMap[merchant]) {
        merchantMap[merchant] = {
          merchant,
          amount: 0,
          transactionCount: 0,
          category: txn.category,
        };
      }

      merchantMap[merchant].amount += Math.abs(txn.amount);
      merchantMap[merchant].transactionCount++;
    }

    const merchants = Object.values(merchantMap);
    merchants.sort((a, b) => b.amount - a.amount);

    return merchants.slice(0, 10); // Top 10
  }

  /**
   * Detect behavioral insights
   * @private
   */
  async _detectBehavioralInsights(
    transactions,
    categoryBreakdown,
    prevInsight
  ) {
    const insights = {
      spikes: [],
      drops: [],
      recurringExpenses: [],
      unusualTransactions: [],
    };

    // Detect spikes and drops
    if (prevInsight && prevInsight.categoryBreakdown) {
      for (const current of categoryBreakdown) {
        const previous = prevInsight.categoryBreakdown.find(
          (c) => c.category === current.category
        );

        if (previous && previous.amount > 0) {
          const change =
            ((current.amount - previous.amount) / previous.amount) * 100;

          if (change > 20) {
            insights.spikes.push({
              category: current.category,
              currentAmount: current.amount,
              previousAmount: previous.amount,
              percentageChange: change,
              message: `${current.category} spending up ${change.toFixed(0)}%`,
            });
          } else if (change < -20) {
            insights.drops.push({
              category: current.category,
              currentAmount: current.amount,
              previousAmount: previous.amount,
              percentageChange: change,
              message: `${current.category} spending down ${Math.abs(
                change
              ).toFixed(0)}%`,
            });
          }
        }
      }
    }

    // Detect recurring expenses
    const merchantFrequency = {};
    for (const txn of transactions) {
      if (!merchantFrequency[txn.merchant]) {
        merchantFrequency[txn.merchant] = [];
      }
      merchantFrequency[txn.merchant].push({
        amount: Math.abs(txn.amount),
        date: txn.date,
      });
    }

    for (const [merchant, occurrences] of Object.entries(merchantFrequency)) {
      if (occurrences.length >= 2) {
        const amounts = occurrences.map((o) => o.amount);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance =
          amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) /
          amounts.length;

        // Low variance = recurring
        if (variance < avgAmount * 0.1) {
          insights.recurringExpenses.push({
            merchant,
            amount: avgAmount,
            frequency: "monthly",
            category: occurrences[0].category,
            lastDate: occurrences[occurrences.length - 1].date,
          });
        }
      }
    }

    // Detect unusual transactions
    const avgAmount =
      transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) /
      transactions.length;

    for (const txn of transactions) {
      if (Math.abs(txn.amount) > avgAmount * 3) {
        insights.unusualTransactions.push({
          merchant: txn.merchant,
          amount: Math.abs(txn.amount),
          category: txn.category,
          date: txn.date,
          reason: `${(Math.abs(txn.amount) / avgAmount).toFixed(
            1
          )}x above average`,
        });
      }
    }

    return insights;
  }

  /**
   * Compute trends (month-over-month)
   * @private
   */
  _computeTrends(summary, categoryBreakdown, prevInsight) {
    if (!prevInsight || !prevInsight.summary) {
      return {
        incomeChange: 0,
        expenseChange: 0,
        savingsChange: 0,
        categoryTrends: [],
      };
    }

    const incomeChange =
      prevInsight.summary.totalIncome > 0
        ? ((summary.totalIncome - prevInsight.summary.totalIncome) /
            prevInsight.summary.totalIncome) *
          100
        : 0;

    const expenseChange =
      prevInsight.summary.totalExpense > 0
        ? ((summary.totalExpense - prevInsight.summary.totalExpense) /
            prevInsight.summary.totalExpense) *
          100
        : 0;

    const savingsChange =
      prevInsight.summary.netSavings !== 0
        ? ((summary.netSavings - prevInsight.summary.netSavings) /
            Math.abs(prevInsight.summary.netSavings)) *
          100
        : 0;

    const categoryTrends = categoryBreakdown.map((current) => {
      const previous = prevInsight.categoryBreakdown?.find(
        (c) => c.category === current.category
      );

      let change = 0;
      let direction = "stable";

      if (previous && previous.amount > 0) {
        change = ((current.amount - previous.amount) / previous.amount) * 100;
        direction = change > 5 ? "up" : change < -5 ? "down" : "stable";
      }

      return {
        category: current.category,
        change,
        direction,
      };
    });

    return {
      incomeChange,
      expenseChange,
      savingsChange,
      categoryTrends,
    };
  }

  /**
   * Compute member breakdown for groups
   * @private
   */
  _computeMemberBreakdown(transactions) {
    const memberMap = {};

    for (const txn of transactions) {
      const userId = txn.userId?._id?.toString() || txn.userId?.toString();
      if (!memberMap[userId]) {
        memberMap[userId] = {
          userId,
          userName: txn.userId?.name || "Unknown",
          totalSpent: 0,
          transactionCount: 0,
        };
      }

      memberMap[userId].totalSpent += Math.abs(txn.amount);
      memberMap[userId].transactionCount++;
    }

    const totalGroupSpent = Object.values(memberMap).reduce(
      (sum, m) => sum + m.totalSpent,
      0
    );

    return Object.values(memberMap).map((member) => ({
      ...member,
      percentage:
        totalGroupSpent > 0 ? (member.totalSpent / totalGroupSpent) * 100 : 0,
    }));
  }

  /**
   * Compute shared categories for groups
   * @private
   */
  _computeSharedCategories(transactions, memberCount) {
    const categoryMap = {};

    for (const txn of transactions) {
      const category = txn.category || "OTHER";
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          totalAmount: 0,
          contributors: new Set(),
        };
      }

      categoryMap[category].totalAmount += Math.abs(txn.amount);
      categoryMap[category].contributors.add(
        txn.userId?._id?.toString() || txn.userId?.toString()
      );
    }

    return Object.values(categoryMap).map((cat) => ({
      category: cat.category,
      totalAmount: cat.totalAmount,
      splitAmount: memberCount > 0 ? cat.totalAmount / memberCount : 0,
      contributors: cat.contributors.size,
    }));
  }

  /**
   * Get empty insight structure
   * @private
   */
  _getEmptyInsight(userId, month, type, groupId = null) {
    return {
      userId,
      groupId,
      month,
      type,
      summary: {
        totalIncome: 0,
        totalExpense: 0,
        netSavings: 0,
        transactionCount: 0,
        avgTransactionAmount: 0,
        largestTransaction: { amount: 0, merchant: null, category: null },
      },
      categoryBreakdown: [],
      topMerchants: [],
      behavioralInsights: {
        spikes: [],
        drops: [],
        recurringExpenses: [],
        unusualTransactions: [],
      },
      trends: {
        incomeChange: 0,
        expenseChange: 0,
        savingsChange: 0,
        categoryTrends: [],
      },
      groupData:
        type === "group"
          ? {
              memberBreakdown: [],
              sharedCategories: [],
            }
          : undefined,
      computedAt: new Date(),
    };
  }

  /**
   * Get previous month string
   * @private
   */
  _getPreviousMonth(month) {
    const date = new Date(`${month}-01`);
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
  }

  /**
   * Invalidate insights cache (called on new uploads)
   */
  async invalidateInsights(userId, month) {
    try {
      await cache.invalidateUserMonth(userId, month);
      await cache.invalidateUserTrends(userId);
      logger.info({ userId, month }, "Insights cache invalidated");
    } catch (error) {
      logger.error({ error }, "Failed to invalidate insights cache");
    }
  }
}

module.exports = new InsightService();
