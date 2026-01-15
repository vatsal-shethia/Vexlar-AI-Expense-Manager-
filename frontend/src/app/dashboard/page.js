"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Vexlar
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-4 text-slate-900">
          Welcome, {user?.firstName || "User"}!
        </h2>

        <div className="grid gap-4 max-w-md">
          <button
            onClick={() => router.push("/upload")}
            className="p-6 bg-white border border-slate-200 rounded-xl hover:shadow-lg transition-shadow text-left"
          >
            <div className="text-2xl mb-2">📤</div>
            <h3 className="font-bold text-lg mb-1 text-slate-900">
              Upload Statement
            </h3>
            <p className="text-sm text-slate-600">
              Upload a PDF bank statement to get started
            </p>
          </button>

          <button
            onClick={() => router.push("/transactions")}
            className="p-6 bg-white border border-slate-200 rounded-xl hover:shadow-lg transition-shadow text-left"
          >
            <div className="text-2xl mb-2">💳</div>
            <h3 className="font-bold text-lg mb-1 text-slate-900">
              View Transactions
            </h3>
            <p className="text-sm text-slate-600">
              See all your categorized transactions
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}
