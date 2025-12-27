require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/Category");
const merchantMappingService = require("../services/merchantMapping.service");
const DEFAULT_CATEGORIES = require("../data/defaultCategories");
const logger = require("../utils/logger");

/**
 * Common Indian merchants with their category mappings
 * This gives the system a "head start" for new users
 */
const COMMON_MERCHANTS = [
  // FOOD & DINING
  { merchant: "swiggy", category: "FOOD", confidence: 1.0 },
  { merchant: "zomato", category: "FOOD", confidence: 1.0 },
  { merchant: "uber eats", category: "FOOD", confidence: 1.0 },
  { merchant: "dominos", category: "FOOD", confidence: 1.0 },
  { merchant: "mcdonalds", category: "FOOD", confidence: 1.0 },
  { merchant: "kfc", category: "FOOD", confidence: 1.0 },
  { merchant: "subway", category: "FOOD", confidence: 1.0 },
  { merchant: "pizza hut", category: "FOOD", confidence: 1.0 },
  { merchant: "burger king", category: "FOOD", confidence: 1.0 },
  { merchant: "starbucks", category: "FOOD", confidence: 1.0 },
  { merchant: "cafe coffee day", category: "FOOD", confidence: 1.0 },
  { merchant: "dunkin donuts", category: "FOOD", confidence: 1.0 },
  { merchant: "biryani blues", category: "FOOD", confidence: 0.95 },
  { merchant: "haldirams", category: "FOOD", confidence: 0.95 },
  { merchant: "wow momo", category: "FOOD", confidence: 0.95 },

  // GROCERIES
  { merchant: "bigbasket", category: "GROCERIES", confidence: 1.0 },
  { merchant: "grofers", category: "GROCERIES", confidence: 1.0 },
  { merchant: "blinkit", category: "GROCERIES", confidence: 1.0 },
  { merchant: "zepto", category: "GROCERIES", confidence: 1.0 },
  { merchant: "dunzo", category: "GROCERIES", confidence: 0.95 },
  { merchant: "jiomart", category: "GROCERIES", confidence: 1.0 },
  { merchant: "dmart", category: "GROCERIES", confidence: 1.0 },
  { merchant: "reliance fresh", category: "GROCERIES", confidence: 1.0 },
  { merchant: "more megastore", category: "GROCERIES", confidence: 0.95 },
  { merchant: "spencer", category: "GROCERIES", confidence: 0.95 },
  { merchant: "nature basket", category: "GROCERIES", confidence: 0.95 },

  // TRANSPORT
  { merchant: "uber", category: "TRANSPORT", confidence: 1.0 },
  { merchant: "ola", category: "TRANSPORT", confidence: 1.0 },
  { merchant: "rapido", category: "TRANSPORT", confidence: 1.0 },
  { merchant: "uber india", category: "TRANSPORT", confidence: 1.0 },
  { merchant: "ola cabs", category: "TRANSPORT", confidence: 1.0 },
  { merchant: "meru cabs", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "metro card", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "indian oil", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "bharat petroleum", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "hp petrol", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "shell", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "fastag", category: "TRANSPORT", confidence: 1.0 },
  { merchant: "paytm fastag", category: "TRANSPORT", confidence: 1.0 },

  // SHOPPING
  { merchant: "amazon", category: "SHOPPING", confidence: 0.95 },
  { merchant: "flipkart", category: "SHOPPING", confidence: 0.95 },
  { merchant: "myntra", category: "SHOPPING", confidence: 1.0 },
  { merchant: "ajio", category: "SHOPPING", confidence: 1.0 },
  { merchant: "meesho", category: "SHOPPING", confidence: 0.95 },
  { merchant: "nykaa", category: "SHOPPING", confidence: 1.0 },
  { merchant: "tata cliq", category: "SHOPPING", confidence: 0.95 },
  { merchant: "snapdeal", category: "SHOPPING", confidence: 0.95 },
  { merchant: "shoppers stop", category: "SHOPPING", confidence: 0.95 },
  { merchant: "westside", category: "SHOPPING", confidence: 0.95 },
  { merchant: "pantaloons", category: "SHOPPING", confidence: 0.95 },
  { merchant: "lifestyle", category: "SHOPPING", confidence: 0.95 },
  { merchant: "max fashion", category: "SHOPPING", confidence: 0.95 },
  { merchant: "h&m", category: "SHOPPING", confidence: 1.0 },
  { merchant: "zara", category: "SHOPPING", confidence: 1.0 },
  { merchant: "uniqlo", category: "SHOPPING", confidence: 1.0 },

  // ENTERTAINMENT
  { merchant: "netflix", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "amazon prime", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "hotstar", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "disney hotstar", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "sony liv", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "zee5", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "voot", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "spotify", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "youtube premium", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "gaana", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "jio saavn", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "bookmyshow", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "paytm movies", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "pvr cinemas", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "inox", category: "ENTERTAINMENT", confidence: 1.0 },

  // UTILITIES
  { merchant: "airtel", category: "UTILITIES", confidence: 1.0 },
  { merchant: "jio", category: "UTILITIES", confidence: 1.0 },
  { merchant: "vodafone", category: "UTILITIES", confidence: 1.0 },
  { merchant: "vi", category: "UTILITIES", confidence: 1.0 },
  { merchant: "bsnl", category: "UTILITIES", confidence: 1.0 },
  { merchant: "act fibernet", category: "UTILITIES", confidence: 1.0 },
  { merchant: "jio fiber", category: "UTILITIES", confidence: 1.0 },
  { merchant: "airtel broadband", category: "UTILITIES", confidence: 1.0 },
  { merchant: "tata sky", category: "UTILITIES", confidence: 1.0 },
  { merchant: "dish tv", category: "UTILITIES", confidence: 1.0 },
  { merchant: "electricity bill", category: "UTILITIES", confidence: 1.0 },
  { merchant: "water bill", category: "UTILITIES", confidence: 1.0 },
  { merchant: "gas cylinder", category: "UTILITIES", confidence: 1.0 },

  // HEALTHCARE
  { merchant: "apollo pharmacy", category: "HEALTHCARE", confidence: 1.0 },
  { merchant: "medplus", category: "HEALTHCARE", confidence: 1.0 },
  { merchant: "1mg", category: "HEALTHCARE", confidence: 1.0 },
  { merchant: "pharmeasy", category: "HEALTHCARE", confidence: 1.0 },
  { merchant: "netmeds", category: "HEALTHCARE", confidence: 1.0 },
  { merchant: "apollo hospital", category: "HEALTHCARE", confidence: 1.0 },
  { merchant: "fortis", category: "HEALTHCARE", confidence: 1.0 },
  { merchant: "max hospital", category: "HEALTHCARE", confidence: 1.0 },
  { merchant: "manipal hospital", category: "HEALTHCARE", confidence: 0.95 },
  { merchant: "practo", category: "HEALTHCARE", confidence: 1.0 },

  // EDUCATION
  { merchant: "udemy", category: "EDUCATION", confidence: 1.0 },
  { merchant: "coursera", category: "EDUCATION", confidence: 1.0 },
  { merchant: "upgrad", category: "EDUCATION", confidence: 1.0 },
  { merchant: "byjus", category: "EDUCATION", confidence: 1.0 },
  { merchant: "unacademy", category: "EDUCATION", confidence: 1.0 },
  { merchant: "great learning", category: "EDUCATION", confidence: 1.0 },
  { merchant: "simplilearn", category: "EDUCATION", confidence: 1.0 },
  { merchant: "linkedin learning", category: "EDUCATION", confidence: 1.0 },
  { merchant: "skillshare", category: "EDUCATION", confidence: 1.0 },

  // TRAVEL
  { merchant: "makemytrip", category: "TRAVEL", confidence: 1.0 },
  { merchant: "goibibo", category: "TRAVEL", confidence: 1.0 },
  { merchant: "yatra", category: "TRAVEL", confidence: 1.0 },
  { merchant: "cleartrip", category: "TRAVEL", confidence: 1.0 },
  { merchant: "irctc", category: "TRAVEL", confidence: 1.0 },
  { merchant: "indigo", category: "TRAVEL", confidence: 1.0 },
  { merchant: "spicejet", category: "TRAVEL", confidence: 1.0 },
  { merchant: "air india", category: "TRAVEL", confidence: 1.0 },
  { merchant: "vistara", category: "TRAVEL", confidence: 1.0 },
  { merchant: "akasa air", category: "TRAVEL", confidence: 1.0 },
  { merchant: "oyo", category: "TRAVEL", confidence: 1.0 },
  { merchant: "treebo", category: "TRAVEL", confidence: 0.95 },
  { merchant: "fab hotels", category: "TRAVEL", confidence: 0.95 },
  { merchant: "airbnb", category: "TRAVEL", confidence: 1.0 },
  { merchant: "booking.com", category: "TRAVEL", confidence: 1.0 },

  // INVESTMENT
  { merchant: "zerodha", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "groww", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "upstox", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "angel one", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "paytm money", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "kuvera", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "coin by zerodha", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "et money", category: "INVESTMENT", confidence: 1.0 },
];

// Additional common merchants (200 entries)
COMMON_MERCHANTS.push(
  // FOOD (40)
  { merchant: "faasos", category: "FOOD", confidence: 0.95 },
  { merchant: "behrouz biryani", category: "FOOD", confidence: 0.95 },
  { merchant: "chaayos", category: "FOOD", confidence: 0.95 },
  { merchant: "barbeque nation", category: "FOOD", confidence: 1.0 },
  { merchant: "sagar ratna", category: "FOOD", confidence: 0.9 },
  { merchant: "berco's", category: "FOOD", confidence: 0.9 },
  { merchant: "karim's", category: "FOOD", confidence: 0.9 },
  { merchant: "baskin robbins", category: "FOOD", confidence: 1.0 },
  { merchant: "cream centre", category: "FOOD", confidence: 0.9 },
  { merchant: "malgudi dhaba", category: "FOOD", confidence: 0.9 },
  { merchant: "kathi roll", category: "FOOD", confidence: 0.9 },
  { merchant: "pizza express", category: "FOOD", confidence: 0.95 },
  { merchant: "theobroma", category: "FOOD", confidence: 0.95 },
  { merchant: "smoor", category: "FOOD", confidence: 0.95 },
  { merchant: "goli vadapav", category: "FOOD", confidence: 0.95 },
  { merchant: "gloria jean's", category: "FOOD", confidence: 0.95 },
  { merchant: "tibetan kitchen", category: "FOOD", confidence: 0.9 },
  { merchant: "sigree", category: "FOOD", confidence: 0.9 },
  { merchant: "mainland china", category: "FOOD", confidence: 0.95 },
  { merchant: "taj hotels", category: "FOOD", confidence: 0.95 },
  { merchant: "olive restaurant", category: "FOOD", confidence: 0.9 },
  { merchant: "biryani by kyle", category: "FOOD", confidence: 0.9 },
  { merchant: "india cafe", category: "FOOD", confidence: 0.9 },
  { merchant: "rajdhani", category: "FOOD", confidence: 0.95 },
  { merchant: "sukh sagar", category: "FOOD", confidence: 0.9 },
  { merchant: "rajdhani thali", category: "FOOD", confidence: 0.95 },
  { merchant: "anand stall", category: "FOOD", confidence: 0.9 },
  { merchant: "hotel empire", category: "FOOD", confidence: 0.9 },
  { merchant: "hotel saravana bhavan", category: "FOOD", confidence: 1.0 },
  { merchant: "saravana bhavan", category: "FOOD", confidence: 1.0 },
  { merchant: "ramakrishna", category: "FOOD", confidence: 0.9 },
  { merchant: "khana khazana", category: "FOOD", confidence: 0.9 },
  { merchant: "mithai bazaar", category: "FOOD", confidence: 0.9 },
  { merchant: "mithai shop", category: "FOOD", confidence: 0.9 },
  { merchant: "sweets corner", category: "FOOD", confidence: 0.9 },
  { merchant: "biryani house", category: "FOOD", confidence: 0.95 },
  { merchant: "keventers", category: "FOOD", confidence: 0.95 },

  // GROCERIES (20)
  { merchant: "big bazaar", category: "GROCERIES", confidence: 1.0 },
  { merchant: "easyday", category: "GROCERIES", confidence: 0.95 },
  { merchant: "spencers retail", category: "GROCERIES", confidence: 0.95 },
  { merchant: "more supermarket", category: "GROCERIES", confidence: 0.95 },
  { merchant: "hypercity", category: "GROCERIES", confidence: 0.9 },
  { merchant: "safal", category: "GROCERIES", confidence: 0.9 },
  { merchant: "apna bazar", category: "GROCERIES", confidence: 0.9 },
  { merchant: "nalini's groceries", category: "GROCERIES", confidence: 0.9 },
  {
    merchant: "nature's basket express",
    category: "GROCERIES",
    confidence: 0.95,
  },
  { merchant: "reliance smart", category: "GROCERIES", confidence: 1.0 },
  { merchant: "dairy day", category: "GROCERIES", confidence: 0.9 },
  { merchant: "bharat bazaar", category: "GROCERIES", confidence: 0.9 },
  { merchant: "local kirana", category: "GROCERIES", confidence: 0.9 },
  { merchant: "kirana store", category: "GROCERIES", confidence: 0.9 },
  { merchant: "neighborhood store", category: "GROCERIES", confidence: 0.9 },
  { merchant: "farmers market", category: "GROCERIES", confidence: 0.9 },
  { merchant: "organic store", category: "GROCERIES", confidence: 0.95 },
  { merchant: "bulk bazaar", category: "GROCERIES", confidence: 0.9 },
  { merchant: "city mart", category: "GROCERIES", confidence: 0.9 },
  { merchant: "daily needs", category: "GROCERIES", confidence: 0.9 },

  // TRANSPORT (15)
  { merchant: "redbus", category: "TRANSPORT", confidence: 1.0 },
  { merchant: "meru", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "ole cabs", category: "TRANSPORT", confidence: 0.9 },
  {
    merchant: "uber eats delivery fee",
    category: "TRANSPORT",
    confidence: 0.9,
  },
  { merchant: "bharat rides", category: "TRANSPORT", confidence: 0.9 },
  { merchant: "auto rickshaw", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "city bus", category: "TRANSPORT", confidence: 0.9 },
  { merchant: "intercity bus", category: "TRANSPORT", confidence: 0.9 },
  { merchant: "taxi fare", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "fuel station", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "bharat petrol pump", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "indian railway", category: "TRANSPORT", confidence: 1.0 },
  { merchant: "bus booking", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "uber pool", category: "TRANSPORT", confidence: 0.95 },
  { merchant: "ola share", category: "TRANSPORT", confidence: 0.95 },

  // SHOPPING (30)
  { merchant: "reliance digital", category: "SHOPPING", confidence: 1.0 },
  { merchant: "croma", category: "SHOPPING", confidence: 1.0 },
  { merchant: "tatacliq", category: "SHOPPING", confidence: 0.95 },
  { merchant: "ajio fashion", category: "SHOPPING", confidence: 0.95 },
  { merchant: "shopclues", category: "SHOPPING", confidence: 0.9 },
  { merchant: "ebay india", category: "SHOPPING", confidence: 0.9 },
  { merchant: "printvenue", category: "SHOPPING", confidence: 0.9 },
  { merchant: "flipkart grocery", category: "SHOPPING", confidence: 0.95 },
  { merchant: "amazon pantry", category: "SHOPPING", confidence: 1.0 },
  { merchant: "stilogic", category: "SHOPPING", confidence: 0.9 },
  { merchant: "caratlane", category: "SHOPPING", confidence: 0.95 },
  { merchant: "tanishq", category: "SHOPPING", confidence: 1.0 },
  { merchant: "mrmoney store", category: "SHOPPING", confidence: 0.9 },
  { merchant: "ajmera store", category: "SHOPPING", confidence: 0.9 },
  { merchant: "pepperfry", category: "SHOPPING", confidence: 1.0 },
  { merchant: "urban ladder", category: "SHOPPING", confidence: 1.0 },
  { merchant: "uber eats merchant", category: "SHOPPING", confidence: 0.9 },
  { merchant: "gadget hub", category: "SHOPPING", confidence: 0.9 },
  { merchant: "bookchor", category: "SHOPPING", confidence: 0.9 },
  { merchant: "pothys", category: "SHOPPING", confidence: 0.95 },
  { merchant: "khadi store", category: "SHOPPING", confidence: 0.9 },
  { merchant: "local boutique", category: "SHOPPING", confidence: 0.9 },
  { merchant: "shoe saavy", category: "SHOPPING", confidence: 0.9 },
  { merchant: "mall charges", category: "SHOPPING", confidence: 0.95 },
  { merchant: "marketplace fee", category: "SHOPPING", confidence: 0.9 },
  { merchant: "fbb", category: "SHOPPING", confidence: 0.9 },
  { merchant: "ajio sale", category: "SHOPPING", confidence: 0.95 },
  { merchant: "clearance outlet", category: "SHOPPING", confidence: 0.9 },
  { merchant: "local crafts", category: "SHOPPING", confidence: 0.9 },

  // ENTERTAINMENT (20)
  { merchant: "mx player", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "altbalaji", category: "ENTERTAINMENT", confidence: 1.0 },
  {
    merchant: "sonyliv subscription",
    category: "ENTERTAINMENT",
    confidence: 1.0,
  },
  { merchant: "erosnow", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "hoichoi", category: "ENTERTAINMENT", confidence: 0.95 },
  { merchant: "zee5 subscription", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "discovery plus", category: "ENTERTAINMENT", confidence: 0.95 },
  { merchant: "apple music", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "itunes", category: "ENTERTAINMENT", confidence: 0.95 },
  { merchant: "play music", category: "ENTERTAINMENT", confidence: 0.9 },
  {
    merchant: "aaj tak subscriptions",
    category: "ENTERTAINMENT",
    confidence: 0.9,
  },
  {
    merchant: "news18 subscription",
    category: "ENTERTAINMENT",
    confidence: 0.9,
  },
  {
    merchant: "cricbuzz subscriptions",
    category: "ENTERTAINMENT",
    confidence: 0.9,
  },
  { merchant: "gaana plus", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "wynk music", category: "ENTERTAINMENT", confidence: 0.95 },
  { merchant: "twitch", category: "ENTERTAINMENT", confidence: 0.95 },
  { merchant: "hotstar premium", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "disney plus", category: "ENTERTAINMENT", confidence: 0.95 },
  { merchant: "prime video india", category: "ENTERTAINMENT", confidence: 1.0 },
  { merchant: "vodafone play", category: "ENTERTAINMENT", confidence: 0.95 },

  // UTILITIES (15)
  { merchant: "phonepe", category: "UTILITIES", confidence: 1.0 },
  { merchant: "google pay", category: "UTILITIES", confidence: 1.0 },
  { merchant: "paytm", category: "UTILITIES", confidence: 1.0 },
  { merchant: "bhim upi", category: "UTILITIES", confidence: 0.95 },
  { merchant: "mobi kwik", category: "UTILITIES", confidence: 0.95 },
  { merchant: "electricity board", category: "UTILITIES", confidence: 1.0 },
  { merchant: "municipal tax", category: "UTILITIES", confidence: 0.95 },
  { merchant: "waterworks", category: "UTILITIES", confidence: 0.95 },
  { merchant: "gas bill payment", category: "UTILITIES", confidence: 1.0 },
  { merchant: "bharat gas booking", category: "UTILITIES", confidence: 1.0 },
  { merchant: "indane", category: "UTILITIES", confidence: 1.0 },
  { merchant: "north indian gas", category: "UTILITIES", confidence: 0.9 },
  { merchant: "salaried tax", category: "UTILITIES", confidence: 0.9 },
  { merchant: "property tax", category: "UTILITIES", confidence: 0.95 },
  { merchant: "broadband payment", category: "UTILITIES", confidence: 1.0 },

  // HEALTHCARE (10)
  { merchant: "medanta", category: "HEALTHCARE", confidence: 1.0 },
  { merchant: "yashoda hospital", category: "HEALTHCARE", confidence: 0.95 },
  { merchant: "apollo clinics", category: "HEALTHCARE", confidence: 1.0 },
  { merchant: "care hospitals", category: "HEALTHCARE", confidence: 0.95 },
  { merchant: "colaba pharmacy", category: "HEALTHCARE", confidence: 0.9 },
  { merchant: "dhanvantari", category: "HEALTHCARE", confidence: 0.9 },
  { merchant: "mfine", category: "HEALTHCARE", confidence: 1.0 },
  { merchant: "docprime", category: "HEALTHCARE", confidence: 0.95 },
  { merchant: "diagnostic center", category: "HEALTHCARE", confidence: 0.95 },
  { merchant: "dental clinic", category: "HEALTHCARE", confidence: 0.9 },

  // EDUCATION (10)
  { merchant: "vedantu", category: "EDUCATION", confidence: 1.0 },
  { merchant: "toppr", category: "EDUCATION", confidence: 1.0 },
  { merchant: "khan academy india", category: "EDUCATION", confidence: 0.95 },
  { merchant: "byjus classes", category: "EDUCATION", confidence: 1.0 },
  { merchant: "vedantu tuition", category: "EDUCATION", confidence: 0.95 },
  { merchant: "extramarks", category: "EDUCATION", confidence: 0.95 },
  { merchant: "mathrubhumi classes", category: "EDUCATION", confidence: 0.9 },
  { merchant: "coursera india", category: "EDUCATION", confidence: 1.0 },
  { merchant: "edx india", category: "EDUCATION", confidence: 0.95 },
  { merchant: "skillindia", category: "EDUCATION", confidence: 0.9 },

  // TRAVEL (15)
  { merchant: "yatra holidays", category: "TRAVEL", confidence: 0.95 },
  { merchant: "red cabin travel", category: "TRAVEL", confidence: 0.9 },
  { merchant: "quickrides", category: "TRAVEL", confidence: 0.9 },
  { merchant: "goair", category: "TRAVEL", confidence: 1.0 },
  { merchant: "jet airways", category: "TRAVEL", confidence: 0.9 },
  { merchant: "indigo airlines", category: "TRAVEL", confidence: 1.0 },
  { merchant: "spicejet bookings", category: "TRAVEL", confidence: 1.0 },
  { merchant: "train ticket", category: "TRAVEL", confidence: 1.0 },
  { merchant: "flight booking", category: "TRAVEL", confidence: 1.0 },
  { merchant: "coach booking", category: "TRAVEL", confidence: 0.95 },
  { merchant: "travel agent", category: "TRAVEL", confidence: 0.95 },
  { merchant: "holiday packages", category: "TRAVEL", confidence: 0.95 },
  { merchant: "bus aggregator", category: "TRAVEL", confidence: 0.9 },
  { merchant: "car rental", category: "TRAVEL", confidence: 0.95 },
  { merchant: "tour operator", category: "TRAVEL", confidence: 0.9 },

  // RENT (5)
  { merchant: "no broker", category: "RENT", confidence: 0.95 },
  { merchant: "nestaway", category: "RENT", confidence: 0.95 },
  { merchant: "magicbricks", category: "RENT", confidence: 0.9 },
  { merchant: "99acres", category: "RENT", confidence: 0.9 },
  { merchant: "housing com", category: "RENT", confidence: 0.9 },

  // INVESTMENT (20)
  { merchant: "hdfc bank", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "icici bank", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "state bank of india", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "axis bank", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "kotak mahindra", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "bank of baroda", category: "INVESTMENT", confidence: 0.95 },
  { merchant: "yes bank", category: "INVESTMENT", confidence: 0.95 },
  { merchant: "idfc first bank", category: "INVESTMENT", confidence: 0.95 },
  { merchant: "indusind bank", category: "INVESTMENT", confidence: 0.95 },
  { merchant: "canara bank", category: "INVESTMENT", confidence: 0.95 },
  { merchant: "union bank", category: "INVESTMENT", confidence: 0.95 },
  { merchant: "central bank", category: "INVESTMENT", confidence: 0.9 },
  { merchant: "federal bank", category: "INVESTMENT", confidence: 0.9 },
  { merchant: "dhanlaxmi bank", category: "INVESTMENT", confidence: 0.9 },
  { merchant: "sbi card", category: "INVESTMENT", confidence: 0.95 },
  { merchant: "hdfc securities", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "icici direct", category: "INVESTMENT", confidence: 1.0 },
  { merchant: "kotak securities", category: "INVESTMENT", confidence: 0.95 },
  { merchant: "bse india", category: "INVESTMENT", confidence: 0.95 },
  { merchant: "nse india", category: "INVESTMENT", confidence: 0.95 }
);

/**
 * Seed database with categories and merchant mappings
 */
async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("Connected to MongoDB for seeding");

    // Step 1: Seed categories
    logger.info("Seeding categories...");
    let categoriesCreated = 0;

    for (const categoryData of DEFAULT_CATEGORIES) {
      const existing = await Category.findOne({
        name: categoryData.name,
        isSystem: true,
      });

      if (!existing) {
        await Category.create({
          ...categoryData,
          isSystem: true,
          userId: null,
        });
        categoriesCreated++;
        logger.info({ category: categoryData.name }, "Category created");
      }
    }

    logger.info(
      { created: categoriesCreated, total: DEFAULT_CATEGORIES.length },
      "Categories seeding completed"
    );

    // Step 2: Seed merchant mappings
    logger.info("Seeding merchant mappings...");
    const mappingsCreated = await merchantMappingService.bulkInsert(
      COMMON_MERCHANTS
    );

    logger.info(
      { created: mappingsCreated, total: COMMON_MERCHANTS.length },
      "Merchant mappings seeding completed"
    );

    // Summary
    console.log("\n✅ Seeding completed successfully!");
    console.log(`📁 Categories: ${categoriesCreated} created`);
    console.log(`🏪 Merchant Mappings: ${mappingsCreated} created`);
    console.log("\n");
  } catch (error) {
    logger.error({ error }, "Seeding failed");
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
