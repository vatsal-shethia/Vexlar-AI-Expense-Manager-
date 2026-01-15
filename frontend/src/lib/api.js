import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const { getToken } = await import("@clerk/nextjs");
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// API methods
export const statementAPI = {
  upload: async (file, groupId = null) => {
    const formData = new FormData();
    formData.append("statement", file);
    if (groupId) {
      formData.append("groupId", groupId);
    }

    const response = await api.post("/statements/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getStatements: async () => {
    const response = await api.get("/statements");
    return response.data;
  },
};

export const transactionAPI = {
  getTransactions: async (filters = {}) => {
    const response = await api.get("/transactions", { params: filters });
    return response.data;
  },

  updateCategory: async (transactionId, category) => {
    const response = await api.patch(
      `/transactions/${transactionId}/category`,
      {
        category,
      }
    );
    return response.data;
  },
};

export const insightAPI = {
  getPersonalInsight: async (month) => {
    const response = await api.get("/insights/personal", { params: { month } });
    return response.data;
  },

  getTrends: async (months = 3) => {
    const response = await api.get("/insights/personal/trends", {
      params: { months },
    });
    return response.data;
  },
};

export default api;
