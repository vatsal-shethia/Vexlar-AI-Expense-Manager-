const BaseParser = require("./base.parser");

class SBIParser extends BaseParser {
  constructor() {
    super("SBI");
  }

  /**
   * Check if text is from SBI bank
   */
  canParse(text) {
    const indicators = [
      "STATE BANK OF INDIA",
      "State Bank of India",
      "SBI",
      "www.sbi.co.in",
      "onlinesbi.com",
    ];
    return indicators.some((indicator) => text.includes(indicator));
  }

  /**
   * Parse SBI statement
   */
  parse(text) {
    try {
      const cleanedText = this.cleanText(text);
      const transactions = [];

      // SBI format: Date | Description | Debit | Credit | Balance
      const lines = cleanedText.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // SBI date format: DD MMM YYYY or DD-MM-YYYY
        const dateMatch = line.match(
          /^(\d{2}\s+\w{3}\s+\d{4}|\d{2}-\d{2}-\d{4})/
        );

        if (dateMatch) {
          const transaction = this.parseSBILine(line);
          if (transaction) {
            transactions.push(this.normalizeTransaction(transaction));
          }
        }
      }

      this.log("SBI parsing completed", {
        transactionCount: transactions.length,
      });
      return transactions;
    } catch (error) {
      this.logError("SBI parsing failed", error);
      throw error;
    }
  }

  /**
   * Parse a single SBI transaction line
   */
  parseSBILine(line) {
    try {
      const parts = line.split(/\s{2,}/);

      if (parts.length < 3) return null;

      const dateStr = parts[0];
      let description = parts[1] || "";

      // Last parts are amounts
      const amounts = parts.slice(-3);
      const debit = amounts[0];
      const credit = amounts[1];
      const balance = amounts[2];

      return {
        date: dateStr,
        description: description.trim(),
        withdrawal: debit,
        deposit: credit,
        balance,
        amount:
          debit && this.parseAmount(debit) > 0
            ? -this.parseAmount(debit)
            : this.parseAmount(credit),
        type: debit && this.parseAmount(debit) > 0 ? "debit" : "credit",
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract statement period for SBI
   */
  extractStatementPeriod(text) {
    const periodMatch = text.match(
      /from\s+(\d{2}\s+\w{3}\s+\d{4})\s+to\s+(\d{2}\s+\w{3}\s+\d{4})/i
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

module.exports = SBIParser;
