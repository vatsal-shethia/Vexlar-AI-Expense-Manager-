const logger = require("../utils/logger");
const Group = require("../models/Group");

/**
 * Service to auto-detect which transactions might be group expenses
 */
class GroupExpenseDetectorService {
  /**
   * Analyze transactions and mark which might be group expenses
   * @param {Array} transactions - Parsed transactions
   * @param {String} groupId - Group ID (if uploading to group)
   * @returns {Array} - Transactions with autoDetectedAsGroup flag
   */
  async detectGroupExpenses(transactions, groupId) {
    if (!groupId) {
      // No group context - return as-is
      return transactions.map((txn) => ({
        ...txn,
        autoDetectedAsGroup: false,
        isGroupExpense: false,
      }));
    }

    try {
      // Fetch group settings
      const group = await Group.findById(groupId);
      if (!group) {
        logger.warn({ groupId }, "Group not found for expense detection");
        return transactions.map((txn) => ({
          ...txn,
          autoDetectedAsGroup: false,
          isGroupExpense: false,
        }));
      }

      const settings = group.settings.autoDetectSettings || {};
      const groupCategories =
        settings.groupCategories || this.getDefaultGroupCategories();
      const groupMerchants = settings.groupMerchants || [];
      const groupKeywords =
        settings.groupKeywords || this.getDefaultGroupKeywords();

      // Analyze each transaction
      const analyzed = transactions.map((txn) => {
        const isGroupExpense = this.isLikelyGroupExpense(
          txn,
          groupCategories,
          groupMerchants,
          groupKeywords
        );

        return {
          ...txn,
          autoDetectedAsGroup: isGroupExpense,
          isGroupExpense: false, // Not confirmed yet - user must approve
        };
      });

      const detectedCount = analyzed.filter(
        (t) => t.autoDetectedAsGroup
      ).length;
      logger.info(
        { groupId, total: transactions.length, detected: detectedCount },
        "Group expense detection completed"
      );

      return analyzed;
    } catch (error) {
      logger.error({ error, groupId }, "Group expense detection failed");
      // Return transactions unmarked on error
      return transactions.map((txn) => ({
        ...txn,
        autoDetectedAsGroup: false,
        isGroupExpense: false,
      }));
    }
  }

  /**
   * Check if transaction is likely a group expense
   */
  isLikelyGroupExpense(
    transaction,
    groupCategories,
    groupMerchants,
    groupKeywords
  ) {
    const merchant = (transaction.merchant || "").toLowerCase();
    const description = (transaction.rawDescription || "").toLowerCase();
    const category = (transaction.category || "").toUpperCase();

    // Check 1: Category match
    if (category && groupCategories.includes(category)) {
      return true;
    }

    // Check 2: Merchant match
    if (groupMerchants.some((gm) => merchant.includes(gm.toLowerCase()))) {
      return true;
    }

    // Check 3: Keyword in description
    if (groupKeywords.some((kw) => description.includes(kw.toLowerCase()))) {
      return true;
    }

    // Check 4: Common group expense patterns
    const commonGroupPatterns = [
      "electricity",
      "water bill",
      "gas bill",
      "internet",
      "wifi",
      "rent",
      "maintenance",
      "society",
      "grocery",
      "groceries",
      "bigbasket",
      "dunzo",
      "swiggy",
      "zomato",
      "blinkit",
      "instamart",
    ];

    if (
      commonGroupPatterns.some(
        (pattern) => merchant.includes(pattern) || description.includes(pattern)
      )
    ) {
      return true;
    }

    // Check 5: Large amounts for typical shared expenses (heuristic)
    const amount = Math.abs(transaction.amount);
    if (category === "BILLS" && amount > 500) return true;
    if (category === "GROCERIES" && amount > 1000) return true;
    if (category === "UTILITIES" && amount > 500) return true;

    return false;
  }

  /**
   * Default group expense categories
   */
  getDefaultGroupCategories() {
    return ["GROCERIES", "UTILITIES", "RENT", "HOUSEHOLD", "BILLS"];
  }

  /**
   * Default group expense keywords
   */
  getDefaultGroupKeywords() {
    return [
      "electricity",
      "water",
      "gas",
      "internet",
      "wifi",
      "rent",
      "maintenance",
      "society",
      "apartment",
    ];
  }

  /**
   * Get detection summary
   */
  getDetectionSummary(transactions) {
    const total = transactions.length;
    const suggestedAsGroup = transactions.filter(
      (t) => t.autoDetectedAsGroup
    ).length;

    return {
      total,
      suggestedAsGroup,
      percentage: total > 0 ? Math.round((suggestedAsGroup / total) * 100) : 0,
    };
  }
}

module.exports = new GroupExpenseDetectorService();
