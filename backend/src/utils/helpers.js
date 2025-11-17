const crypto = require("crypto");

/**
 * Generate a random invite code for groups
 */
function generateInviteCode(length = 8) {
  return crypto
    .randomBytes(length)
    .toString("hex")
    .toUpperCase()
    .slice(0, length);
}

/**
 * Calculate file hash for duplicate detection
 */
function calculateFileHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Normalize merchant name for better matching
 */
function normalizeMerchant(merchant) {
  if (!merchant) return "";

  return merchant
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, " "); // Normalize spaces
}

/**
 * Format month string (YYYY-MM)
 */
function formatMonth(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get date range for a month
 */
function getMonthDateRange(monthString) {
  const [year, month] = monthString.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}

/**
 * Calculate percentage change
 */
function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

module.exports = {
  generateInviteCode,
  calculateFileHash,
  normalizeMerchant,
  formatMonth,
  getMonthDateRange,
  calculatePercentageChange,
};
