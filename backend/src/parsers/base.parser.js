const logger = require("../utils/logger");

/**
 * Base parser class that all bank parsers extend
 */
class BaseParser {
  constructor(bankName) {
    this.bankName = bankName;
  }

  /**
   * Main parsing method - must be implemented by subclasses
   * @param {string} text - Extracted PDF text
   * @returns {Array} - Array of normalized transactions
   */
  parse(text) {
    throw new Error("parse() must be implemented by subclass");
  }

  /**
   * Detect if this parser can handle the given text
   * @param {string} text - PDF text
   * @returns {boolean}
   */
  canParse(text) {
    throw new Error("canParse() must be implemented by subclass");
  }

  /**
   * Extract statement period from text
   * @param {string} text
   * @returns {Object} { from: Date, to: Date }
   */
  extractStatementPeriod(text) {
    // Default implementation - override if needed
    return {
      from: null,
      to: null,
    };
  }

  /**
   * Normalize a transaction to our standard format
   * @param {Object} rawTransaction
   * @returns {Object} Normalized transaction
   */
  normalizeTransaction(rawTransaction) {
    return {
      date: this.parseDate(rawTransaction.date),
      merchant: this.normalizeMerchant(
        rawTransaction.merchant || rawTransaction.description
      ),
      rawDescription: rawTransaction.description || rawTransaction.merchant,
      amount: this.parseAmount(rawTransaction.amount),
      type: rawTransaction.type || this.detectTransactionType(rawTransaction),
      mode: this.detectPaymentMode(rawTransaction),
      balanceAfter: rawTransaction.balance
        ? this.parseAmount(rawTransaction.balance)
        : null,
    };
  }

  /**
   * Parse date string to Date object
   * @param {string} dateStr
   * @returns {Date}
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    // Try common Indian date formats: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY
    const formats = [
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
      /(\d{2})\s+(\w{3})\s+(\d{4})/, // DD MMM YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[2]) {
          // DD MMM YYYY format
          const [, day, month, year] = match;
          const monthMap = {
            Jan: 0,
            Feb: 1,
            Mar: 2,
            Apr: 3,
            May: 4,
            Jun: 5,
            Jul: 6,
            Aug: 7,
            Sep: 8,
            Oct: 9,
            Nov: 10,
            Dec: 11,
          };
          return new Date(year, monthMap[month], day);
        } else {
          // DD/MM/YYYY or DD-MM-YYYY
          const [, day, month, year] = match;
          return new Date(year, month - 1, day);
        }
      }
    }

    // Fallback to native Date parsing
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Parse amount string to number
   * @param {string} amountStr
   * @returns {number}
   */
  parseAmount(amountStr) {
    if (!amountStr) return 0;

    // Remove currency symbols, commas, and spaces
    const cleaned = amountStr
      .toString()
      .replace(/[₹$,\s]/g, "")
      .replace(/[()]/g, ""); // Remove parentheses

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  }

  /**
   * Normalize merchant name
   * @param {string} merchant
   * @returns {string}
   */
  normalizeMerchant(merchant) {
    if (!merchant) return "Unknown";

    return merchant.trim().replace(/\s+/g, " ").slice(0, 100); // Limit length
  }

  /**
   * Detect transaction type (debit/credit)
   * @param {Object} transaction
   * @returns {string} 'debit' or 'credit'
   */
  detectTransactionType(transaction) {
    const { amount, description = "", withdrawal, deposit } = transaction;

    // Check explicit withdrawal/deposit fields
    if (withdrawal && parseFloat(withdrawal) > 0) return "debit";
    if (deposit && parseFloat(deposit) > 0) return "credit";

    // Check description for keywords
    const desc = description.toLowerCase();
    const creditKeywords = [
      "credit",
      "deposit",
      "salary",
      "refund",
      "reversal",
    ];
    const debitKeywords = ["debit", "withdrawal", "payment", "purchase"];

    if (creditKeywords.some((kw) => desc.includes(kw))) return "credit";
    if (debitKeywords.some((kw) => desc.includes(kw))) return "debit";

    // Default: negative amount = debit, positive = credit
    return amount < 0 ? "debit" : "credit";
  }

  /**
   * Detect payment mode from description
   * @param {Object} transaction
   * @returns {string}
   */
  detectPaymentMode(transaction) {
    const desc = (
      transaction.description ||
      transaction.merchant ||
      ""
    ).toLowerCase();

    if (
      desc.includes("upi") ||
      desc.includes("paytm") ||
      desc.includes("phonepe") ||
      desc.includes("gpay")
    ) {
      return "UPI";
    }
    if (desc.includes("atm")) {
      return "ATM";
    }
    if (desc.includes("card") || desc.includes("pos")) {
      return "CARD";
    }
    if (
      desc.includes("neft") ||
      desc.includes("rtgs") ||
      desc.includes("imps")
    ) {
      return desc.includes("neft")
        ? "NEFT"
        : desc.includes("rtgs")
        ? "NEFT"
        : "IMPS";
    }
    if (desc.includes("cash")) {
      return "CASH";
    }

    return "OTHER";
  }

  /**
   * Clean and prepare text for parsing
   * @param {string} text
   * @returns {string}
   */
  cleanText(text) {
    return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  }

  /**
   * Log parsing info
   */
  log(message, data = {}) {
    logger.info({ bank: this.bankName, ...data }, message);
  }

  /**
   * Log parsing error
   */
  logError(message, error) {
    logger.error({ bank: this.bankName, error }, message);
  }
}

module.exports = BaseParser;
