"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { transactionAPI } from "@/lib/api";
import {
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  Tag,
} from "lucide-react";

const CATEGORIES = [
  "FOOD",
  "GROCERIES",
  "TRANSPORT",
  "SHOPPING",
  "ENTERTAINMENT",
  "UTILITIES",
  "HEALTHCARE",
  "EDUCATION",
  "TRAVEL",
  "RENT",
  "INVESTMENT",
  "INCOME",
  "TRANSFER",
  "OTHER",
];

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionAPI.getTransactions({
        limit: 200,
      });
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (transactionId, newCategory) => {
    try {
      await transactionAPI.updateCategory(transactionId, newCategory);

      // Update local state
      setTransactions((prev) =>
        prev.map((txn) =>
          txn._id === transactionId ? { ...txn, category: newCategory } : txn
        )
      );
    } catch (error) {
      console.error("Failed to update category:", error);
      alert("Failed to update category");
    }
  };

  const filteredTransactions =
    filter === "all"
      ? transactions
      : filter === "uncategorized"
      ? transactions.filter((t) => !t.category)
      : transactions.filter((t) => t.category === filter);

  const formatAmount = (amount, type) => {
    const formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));

    return type === "credit" ? `+${formatted}` : `-${formatted}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      FOOD: "bg-red-100 text-red-700",
      GROCERIES: "bg-green-100 text-green-700",
      TRANSPORT: "bg-blue-100 text-blue-700",
      SHOPPING: "bg-purple-100 text-purple-700",
      ENTERTAINMENT: "bg-pink-100 text-pink-700",
      UTILITIES: "bg-yellow-100 text-yellow-700",
      HEALTHCARE: "bg-cyan-100 text-cyan-700",
      EDUCATION: "bg-indigo-100 text-indigo-700",
      TRAVEL: "bg-teal-100 text-teal-700",
      INCOME: "bg-emerald-100 text-emerald-700",
    };
    return colors[category] || "bg-slate-100 text-slate-700";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Vexlar
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/upload")}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm"
              >
                Upload Statement
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
              >
                Dashboard
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                filter === "all"
                  ? "bg-violet-600 text-white"
                  : "bg-white border border-slate-300 hover:bg-slate-50"
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setFilter("uncategorized")}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                filter === "uncategorized"
                  ? "bg-violet-600 text-white"
                  : "bg-white border border-slate-300 hover:bg-slate-50"
              }`}
            >
              Uncategorized ({transactions.filter((t) => !t.category).length})
            </button>
            {CATEGORIES.slice(0, 8).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                  filter === cat
                    ? "bg-violet-600 text-white"
                    : "bg-white border border-slate-300 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Transactions List */}
      <main className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No transactions found
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTransactions.map((txn) => (
                <div
                  key={txn._id}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            txn.type === "credit"
                              ? "bg-green-100"
                              : "bg-red-100"
                          }`}
                        >
                          {txn.type === "credit" ? (
                            <ArrowDownRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {txn.merchant}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatDate(txn.date)} · {txn.mode}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Category Selector */}
                      <select
                        value={txn.category || ""}
                        onChange={(e) =>
                          handleCategoryChange(txn._id, e.target.value)
                        }
                        className={`px-3 py-1.5 rounded-lg text-sm border-0 cursor-pointer ${
                          txn.category
                            ? getCategoryColor(txn.category)
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <option value="">Select category</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      {/* Amount */}
                      <div
                        className={`text-right font-semibold ${
                          txn.type === "credit"
                            ? "text-green-600"
                            : "text-slate-900"
                        }`}
                      >
                        {formatAmount(txn.amount, txn.type)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
