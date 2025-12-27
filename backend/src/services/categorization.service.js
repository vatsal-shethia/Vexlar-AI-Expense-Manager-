const merchantMappingService = require("./merchantMapping.service");
const Category = require("../models/Category");
const { getGeminiModel } = require("../config/gemini");
const logger = require("../utils/logger");

class CategorizationService {
  constructor() {
    this.categoriesCache = null;
    this.CONFIDENCE_THRESHOLD = 0.75; // Trigger AI if below this
  }

  /**
   * Categorize a single transaction
   * @param {Object} transaction - Transaction object
   * @param {String} userId - User ID
   * @returns {Object} { category, confidence, categorizedBy }
   */
  async categorizeTransaction(transaction, userId = null) {
    try {
      // Step 1: Check merchant mappings
      const mappingResult = await this.checkMerchantMapping(
        transaction.merchant,
        userId
      );
      if (
        mappingResult &&
        mappingResult.confidence >= this.CONFIDENCE_THRESHOLD
      ) {
        return mappingResult;
      }

      // Step 2: Try rule-based categorization
      const ruleResult = await this.ruleBasedCategorization(transaction);
      if (ruleResult && ruleResult.confidence >= this.CONFIDENCE_THRESHOLD) {
        // Save to merchant mappings for future (learning)
        await merchantMappingService.saveMapping(
          transaction.merchant,
          ruleResult.category,
          ruleResult.confidence,
          userId
        );
        return ruleResult;
      }

      // Step 3: AI fallback for low confidence
      const aiResult = await this.aiCategorization(transaction);
      if (aiResult) {
        // Save AI result to merchant mappings (system learns)
        if (aiResult.confidence >= 0.8) {
          await merchantMappingService.saveMapping(
            transaction.merchant,
            aiResult.category,
            aiResult.confidence,
            userId
          );
        }
        return aiResult;
      }

      // Step 4: Default to uncategorized
      return {
        category: null,
        confidence: null,
        categorizedBy: null,
      };
    } catch (error) {
      logger.error(
        { error, transaction: transaction._id },
        "Categorization failed"
      );
      return {
        category: null,
        confidence: null,
        categorizedBy: null,
      };
    }
  }

  /**
   * Categorize multiple transactions in batch
   * @param {Array} transactions - Array of transaction objects
   * @param {String} userId - User ID
   * @returns {Array} Categorized transactions
   */
  async categorizeBatch(transactions, userId = null) {
    try {
      logger.info(
        { count: transactions.length, userId },
        "Starting batch categorization"
      );

      const results = [];

      // Step 1: Quick rule-based pass for all
      for (const txn of transactions) {
        const result = await this.categorizeTransaction(txn, userId);
        results.push({
          ...txn,
          category: result.category,
          categoryConfidence: result.confidence,
          categorizedBy: result.categorizedBy,
        });
      }

      // Step 2: Collect uncategorized for batch AI call
      const uncategorized = results.filter((r) => !r.category);

      if (uncategorized.length > 0) {
        logger.info(
          { count: uncategorized.length },
          "Batch AI categorization for uncertain transactions"
        );

        // Batch AI call (send multiple at once)
        const aiResults = await this.batchAICategorization(
          uncategorized,
          userId
        );

        // Merge AI results back
        aiResults.forEach((aiResult, index) => {
          const txnIndex = results.findIndex(
            (r) =>
              r.merchant === uncategorized[index].merchant &&
              r.date === uncategorized[index].date
          );
          if (txnIndex !== -1) {
            results[txnIndex].category = aiResult.category;
            results[txnIndex].categoryConfidence = aiResult.confidence;
            results[txnIndex].categorizedBy = aiResult.categorizedBy;
          }
        });
      }

      logger.info(
        {
          total: results.length,
          categorized: results.filter((r) => r.category).length,
          uncategorized: results.filter((r) => !r.category).length,
        },
        "Batch categorization completed"
      );

      return results;
    } catch (error) {
      logger.error(
        { error, count: transactions.length },
        "Batch categorization failed"
      );
      throw error;
    }
  }

  /**
   * Check merchant mapping database
   */
  async checkMerchantMapping(merchant, userId) {
    try {
      const mapping = await merchantMappingService.findMapping(
        merchant,
        userId
      );
      if (mapping) {
        return {
          category: mapping.category,
          confidence: mapping.confidence,
          categorizedBy: "rule",
        };
      }
      return null;
    } catch (error) {
      logger.error({ error, merchant }, "Merchant mapping check failed");
      return null;
    }
  }

  /**
   * Rule-based categorization using keywords and patterns
   */
  async ruleBasedCategorization(transaction) {
    try {
      // Load categories (cached)
      const categories = await this.getCategories();

      const merchant = transaction.merchant.toLowerCase();
      const description = transaction.rawDescription.toLowerCase();
      const amount = Math.abs(transaction.amount);
      const mode = transaction.mode;
      const type = transaction.type;

      let bestMatch = null;
      let highestScore = 0;

      // Income detection (credit transactions)
      if (type === "credit") {
        const incomeKeywords = [
          "salary",
          "income",
          "refund",
          "cashback",
          "reward",
        ];
        if (incomeKeywords.some((kw) => description.includes(kw))) {
          return {
            category: "INCOME",
            confidence: 0.95,
            categorizedBy: "rule",
          };
        }
      }

      // Transfer detection
      if (mode === "NEFT" || mode === "IMPS" || mode === "RTGS") {
        const transferKeywords = ["transfer", "self", "wallet"];
        if (transferKeywords.some((kw) => description.includes(kw))) {
          return {
            category: "TRANSFER",
            confidence: 0.9,
            categorizedBy: "rule",
          };
        }
      }

      // Keyword matching against all categories
      for (const category of categories) {
        if (!category.keywords || category.keywords.length === 0) continue;

        let matchScore = 0;
        let matchedKeywords = 0;

        for (const keyword of category.keywords) {
          // Check merchant name
          if (merchant.includes(keyword)) {
            matchScore += 2; // Merchant match is stronger
            matchedKeywords++;
          }
          // Check description
          if (description.includes(keyword)) {
            matchScore += 1;
            matchedKeywords++;
          }
        }

        if (matchScore > highestScore) {
          highestScore = matchScore;
          bestMatch = {
            category: category.name,
            matchedKeywords,
            score: matchScore,
          };
        }
      }

      // Calculate confidence based on match strength
      if (bestMatch) {
        let confidence = 0;

        if (bestMatch.matchedKeywords >= 3) {
          confidence = 0.95; // Multiple keyword matches
        } else if (bestMatch.matchedKeywords === 2) {
          confidence = 0.85;
        } else if (bestMatch.matchedKeywords === 1 && bestMatch.score >= 2) {
          confidence = 0.8; // Single merchant match
        } else {
          confidence = 0.65; // Single keyword in description
        }

        return {
          category: bestMatch.category,
          confidence,
          categorizedBy: "rule",
        };
      }

      return null;
    } catch (error) {
      logger.error({ error }, "Rule-based categorization failed");
      return null;
    }
  }

  /**
   * AI categorization using Gemini Pro
   */
  async aiCategorization(transaction) {
    try {
      const model = getGeminiModel();
      if (!model) {
        logger.warn("Gemini model not available, skipping AI categorization");
        return null;
      }

      const categories = await this.getCategories();
      const categoryNames = categories.map((c) => c.name).join(", ");

      const prompt = `You are a financial transaction categorizer. Analyze this transaction and return ONLY a JSON object.

Transaction Details:
- Merchant: ${transaction.merchant}
- Description: ${transaction.rawDescription}
- Amount: ₹${Math.abs(transaction.amount)}
- Type: ${transaction.type}
- Mode: ${transaction.mode}

Available Categories: ${categoryNames}

Rules:
1. Choose the MOST appropriate category
2. Consider merchant name first, then description
3. Return confidence between 0.0 and 1.0
4. Be conservative with confidence (0.7-0.9 typical)

Response format (MUST be valid JSON):
{
  "category": "CATEGORY_NAME",
  "confidence": 0.85,
  "reasoning": "Brief explanation"
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ response: text }, "Gemini returned non-JSON response");
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate response
      if (!parsed.category || typeof parsed.confidence !== "number") {
        logger.warn({ parsed }, "Invalid Gemini response structure");
        return null;
      }

      logger.info(
        {
          merchant: transaction.merchant,
          category: parsed.category,
          confidence: parsed.confidence,
        },
        "AI categorization successful"
      );

      return {
        category: parsed.category,
        confidence: Math.min(parsed.confidence, 0.95), // Cap at 0.95
        categorizedBy: "ai",
      };
    } catch (error) {
      logger.error({ error, transaction }, "AI categorization failed");
      return null;
    }
  }

  /**
   * Batch AI categorization (optimized for multiple transactions)
   */
  async batchAICategorization(transactions, userId) {
    try {
      const model = getGeminiModel();
      if (!model) {
        return transactions.map(() => ({
          category: null,
          confidence: null,
          categorizedBy: null,
        }));
      }

      // Limit batch size to avoid token limits
      const batchSize = 10;
      const results = [];

      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);

        const categories = await this.getCategories();
        const categoryNames = categories.map((c) => c.name).join(", ");

        const transactionList = batch
          .map(
            (txn, idx) =>
              `${idx + 1}. Merchant: ${txn.merchant}, Description: ${
                txn.rawDescription
              }, Amount: ₹${Math.abs(txn.amount)}, Type: ${txn.type}`
          )
          .join("\n");

        const prompt = `Categorize these ${batch.length} transactions. Return ONLY a JSON array.

Transactions:
${transactionList}

Available Categories: ${categoryNames}

Response format (MUST be valid JSON array):
[
  {"index": 1, "category": "FOOD", "confidence": 0.9},
  {"index": 2, "category": "TRANSPORT", "confidence": 0.85}
]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON array
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          // Map results back to transactions
          for (const item of parsed) {
            if (item.index && item.category) {
              results.push({
                category: item.category,
                confidence: Math.min(item.confidence || 0.8, 0.95),
                categorizedBy: "ai",
              });

              // Save to merchant mappings
              const txn = batch[item.index - 1];
              if (txn && item.confidence >= 0.8) {
                await merchantMappingService.saveMapping(
                  txn.merchant,
                  item.category,
                  item.confidence,
                  userId
                );
              }
            }
          }
        }
      }

      return results;
    } catch (error) {
      logger.error({ error }, "Batch AI categorization failed");
      return transactions.map(() => ({
        category: null,
        confidence: null,
        categorizedBy: null,
      }));
    }
  }

  /**
   * Get categories (with caching)
   */
  async getCategories() {
    if (this.categoriesCache) {
      return this.categoriesCache;
    }

    const categories = await Category.find({ isSystem: true }).lean();
    this.categoriesCache = categories;

    return categories;
  }

  /**
   * Clear category cache (call after seeding)
   */
  clearCache() {
    this.categoriesCache = null;
  }
}

module.exports = new CategorizationService();
