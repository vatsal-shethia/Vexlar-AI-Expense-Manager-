const { z } = require("zod");

// User validation schemas
const userSchemas = {
  syncProfile: z.object({
    clerkId: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    profile: z
      .object({
        monthlyIncome: z.number().positive().optional(),
        currency: z.string().default("INR"),
        financialGoals: z.array(z.string()).optional(),
        riskLevel: z
          .enum(["conservative", "moderate", "aggressive"])
          .optional(),
      })
      .optional(),
  }),
};

// Transaction validation schemas
const transactionSchemas = {
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    category: z.string().optional(),
    groupId: z.string().optional(),
  }),

  updateCategory: z.object({
    category: z.string().min(1),
  }),
};

// Group validation schemas
const groupSchemas = {
  create: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    currency: z.string().default("INR"),
  }),

  update: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
  }),
};

// Statement validation schemas
const statementSchemas = {
  upload: z.object({
    groupId: z.string().optional(),
  }),
};

// AI validation schemas
const aiSchemas = {
  chat: z.object({
    message: z.string().min(1).max(1000),
    groupId: z.string().optional(),
    sessionId: z.string().optional(),
  }),
};

module.exports = {
  userSchemas,
  transactionSchemas,
  groupSchemas,
  statementSchemas,
  aiSchemas,
};
