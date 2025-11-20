const BaseParser = require("./base.parser");

class ICICIParser extends BaseParser {
  constructor() {
    super("ICICI");
  }

  /**
   * Check if text is from ICICI bank
   */
  canParse(text) {
    const indicators = [
      "ICICI BANK",
      "ICICI Bank",
      "icici bank",
      "www.icicibank.com",
    ];
    return indicators.some((indicator) => text.includes(indicator));
  }

  /**
   * Parse ICICI statement
   */
  parse(text) {
    try {
      const cleanedText = this.cleanText(text);
      const transactions = [];

      // ICICI format: S.No | Date | Description | Cheque No | Withdrawal | Deposit | Balance
      const lines = cleanedText.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // ICICI often has serial number followed by date
        const dateMatch = line.match(
          /\d+\s+(\d{2}\/\d{2}\/\d{4}|\d{2}-\w{3}-\d{4})/
        );

        if (dateMatch) {
          const transaction = this.parseICICILine(line);
          if (transaction) {
            transactions.push(this.normalizeTransaction(transaction));
          }
        }
      }

      this.log("ICICI parsing completed", {
        transactionCount: transactions.length,
      });
      return transactions;
    } catch (error) {
      this.logError("ICICI parsing failed", error);
      throw error;
    }
  }

  /**
   * Parse a single ICICI transaction line
   */
  parseICICILine(line) {
    try {
      // Remove serial number
      const withoutSerial = line.replace(/^\d+\s+/, "");

      // Split by multiple spaces
      const parts = withoutSerial.split(/\s{2,}/);

      if (parts.length < 3) return null;

      const dateStr = parts[0];
      let description = parts[1] || "";

      // Find amounts (last 3 parts usually)
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
   * Extract statement period for ICICI
   */
  extractStatementPeriod(text) {
    const periodMatch = text.match(
      /(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/i
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

module.exports = ICICIParser;
