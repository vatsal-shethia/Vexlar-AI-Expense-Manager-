const pdfParse = require("pdf-parse");
const HDFCParser = require("./hdfc.parser");
const ICICIParser = require("./icici.parser");
const SBIParser = require("./sbi.parser");
const logger = require("../utils/logger");

/**
 * Parser factory - detects bank and routes to correct parser
 */
class ParserService {
  constructor() {
    // Initialize all parsers
    this.parsers = [new HDFCParser(), new ICICIParser(), new SBIParser()];
  }

  /**
   * Parse PDF buffer and extract transactions
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Object} { bankName, transactions, statementPeriod }
   */
  async parsePDF(pdfBuffer) {
    try {
      logger.info("Starting PDF parse...");

      // Call pdf-parse directly with just the buffer
      let data;
      try {
        data = await pdfParse(pdfBuffer);
      } catch (pdfError) {
        logger.error({ error: pdfError }, "pdf-parse failed");
        throw new Error(`Failed to extract PDF text: ${pdfError.message}`);
      }

      const text = data.text;
      logger.info(
        { textLength: text.length },
        "PDF text extracted successfully"
      );

      if (!text || text.trim().length === 0) {
        throw new Error("PDF appears to be empty or could not be read");
      }

      // Detect bank and get appropriate parser
      const parser = this.detectBank(text);

      if (!parser) {
        throw new Error(
          "Could not detect bank. Supported banks: HDFC, ICICI, SBI. " +
            "Please ensure this is a digital bank statement (not scanned)."
        );
      }

      logger.info({ bank: parser.bankName }, "Bank detected");

      // Parse transactions
      const transactions = parser.parse(text);

      if (!transactions || transactions.length === 0) {
        throw new Error(
          `No transactions found in ${parser.bankName} statement. ` +
            "Please ensure this is a valid bank statement with transaction history."
        );
      }

      // Extract statement period
      const statementPeriod = parser.extractStatementPeriod(text);

      logger.info(
        {
          bank: parser.bankName,
          transactionCount: transactions.length,
          period: statementPeriod,
        },
        "Statement parsed successfully"
      );

      return {
        bankName: parser.bankName,
        transactions,
        statementPeriod,
      };
    } catch (error) {
      logger.error({ error }, "PDF parsing failed");
      throw error;
    }
  }

  /**
   * Detect which bank the statement is from
   * @param {string} text - Extracted PDF text
   * @returns {BaseParser|null} - Matching parser or null
   */
  detectBank(text) {
    for (const parser of this.parsers) {
      if (parser.canParse(text)) {
        return parser;
      }
    }
    return null;
  }

  /**
   * Get list of supported banks
   * @returns {Array<string>}
   */
  getSupportedBanks() {
    return this.parsers.map((p) => p.bankName);
  }
}

// Export singleton instance
module.exports = new ParserService();

// const pdfParse = require("pdf-parse");
// const HDFCParser = require("./hdfc.parser");
// const ICICIParser = require("./icici.parser");
// const SBIParser = require("./sbi.parser");
// const logger = require("../utils/logger");

// //detects bank and routes to correct parser

// class ParserService {
//   constructor() {
//     // Initialize all parsers
//     this.parsers = [new HDFCParser(), new ICICIParser(), new SBIParser()];
//   }

//   /**
//    * Parse PDF buffer and extract transactions
//    * @param {Buffer} pdfBuffer - PDF file buffer
//    * @returns {Object} { bankName, transactions, statementPeriod }
//    */
//   async parsePDF(pdfBuffer) {
//     try {
//       // Extract text from PDF
//       //new block
//       const data = await pdfParse(pdfBuffer, {
//         // pdf-parse options
//         max: 0, // Parse all pages
//       });
//       // const data = await pdfParse(pdfBuffer);
//       const text = data.text;

//       if (!text || text.trim().length === 0) {
//         throw new Error("PDF appears to be empty or could not be read");
//       }

//       logger.info({ textLength: text.length }, "PDF text extracted");

//       // Detect bank and get appropriate parser
//       const parser = this.detectBank(text);

//       if (!parser) {
//         throw new Error(
//           "Could not detect bank. Supported banks: HDFC, ICICI, SBI. " +
//             "Please ensure this is a digital bank statement (not scanned)."
//         );
//       }

//       logger.info({ bank: parser.bankName }, "Bank detected");

//       // Parse transactions
//       const transactions = parser.parse(text);

//       if (!transactions || transactions.length === 0) {
//         throw new Error(
//           `No transactions found in ${parser.bankName} statement. ` +
//             "Please ensure this is a valid bank statement with transaction history."
//         );
//       }

//       // Extract statement period
//       const statementPeriod = parser.extractStatementPeriod(text);

//       logger.info(
//         {
//           bank: parser.bankName,
//           transactionCount: transactions.length,
//           period: statementPeriod,
//         },
//         "Statement parsed successfully"
//       );

//       return {
//         bankName: parser.bankName,
//         transactions,
//         statementPeriod,
//       };
//     } catch (error) {
//       logger.error({ error }, "PDF parsing failed");
//       throw error;
//     }
//   }

//   /**
//    * Detect which bank the statement is from
//    * @param {string} text - Extracted PDF text
//    * @returns {BaseParser|null} - Matching parser or null
//    */
//   detectBank(text) {
//     for (const parser of this.parsers) {
//       if (parser.canParse(text)) {
//         return parser;
//       }
//     }
//     return null;
//   }

//   /**
//    * Get list of supported banks
//    * @returns {Array<string>}
//    */
//   getSupportedBanks() {
//     return this.parsers.map((p) => p.bankName);
//   }
// }

// const parserServiceInstance = new ParserService();
// module.exports = parserServiceInstance;
