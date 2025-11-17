const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

let genAI = null;
let model = null;

const initGemini = () => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn("Gemini API key not found");
      return null;
    }

    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-pro" });

    logger.info("Gemini AI initialized successfully");
    return model;
  } catch (error) {
    logger.error({ error }, "Gemini initialization failed");
    return null;
  }
};

const getGeminiModel = () => {
  if (!model) {
    model = initGemini();
  }
  return model;
};

module.exports = { initGemini, getGeminiModel };
