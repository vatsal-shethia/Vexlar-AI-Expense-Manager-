const BaseParser = require("./base.parser");

class HDFCParser extends BaseParser {
  constructor() {
    super("HDFC");
  }

  /**
   * Check if text is from HDFC bank
   */
  canParse(text) {
    const indicators = [
      "HDFC BANK",
      "HDFC Bank",
      "hdfc bank",
      "www.hdfcbank.com",
    ];
    return indicators.some((indicator) => text.includes(indicator));
  }

  /**
   * Parse HDFC statement
   */
  parse(text) {
    try {
      const cleanedText = this.cleanText(text);
      const transactions = [];

      // HDFC format: Date | Description | Withdrawal | Deposit | Balance
      // Pattern: DD/MM/YY or DD/MM/YYYY followed by description and amounts

      const lines = cleanedText.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Look for date pattern at start of line
        const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{2,4})/);

        if (dateMatch) {
          const transaction = this.parseHDFCLine(line, lines, i);
          if (transaction) {
            transactions.push(this.normalizeTransaction(transaction));
          }
        }
      }

      this.log("HDFC parsing completed", {
        transactionCount: transactions.length,
      });
      return transactions;
    } catch (error) {
      this.logError("HDFC parsing failed", error);
      throw error;
    }
  }

  /**
   * Parse a single HDFC transaction line
   */
  parseHDFCLine(line, allLines, currentIndex) {
    try {
      // HDFC typical format: "DD/MM/YY Description Amount1 Amount2 Balance"
      const parts = line.split(/\s{2,}/); // Split by 2+ spaces

      if (parts.length < 3) return null;

      const dateStr = parts[0];
      let description = parts[1] || "";

      // Sometimes description spans multiple parts
      let amountStartIndex = 2;
      for (let i = 2; i < parts.length - 2; i++) {
        if (!this.isAmount(parts[i])) {
          description += " " + parts[i];
          amountStartIndex = i + 1;
        } else {
          break;
        }
      }

      // Last 3 parts are usually: withdrawal, deposit, balance
      const amounts = parts.slice(-3);
      const withdrawal = amounts[0];
      const deposit = amounts[1];
      const balance = amounts[2];

      return {
        date: dateStr,
        description: description.trim(),
        withdrawal,
        deposit,
        balance,
        amount:
          withdrawal && this.parseAmount(withdrawal) > 0
            ? -this.parseAmount(withdrawal)
            : this.parseAmount(deposit),
        type:
          withdrawal && this.parseAmount(withdrawal) > 0 ? "debit" : "credit",
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if string looks like an amount
   */
  isAmount(str) {
    return /^[\d,]+\.?\d*$/.test(str.replace(/[₹$]/g, ""));
  }

  /**
   * Extract statement period for HDFC
   */
  extractStatementPeriod(text) {
    // Look for "Statement from DD/MM/YYYY to DD/MM/YYYY"
    const periodMatch = text.match(
      /statement\s+from\s+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/i
    );

    if (periodMatch) {
      return {
        from: this.parseDate(periodMatch[1]),
        to: this.parseDate(periodMatch[2]),
      };
    }

    return { from: null, to: null };
  }
}

module.exports = HDFCParser;
