"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Vexlar
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/sign-in")}
              className="px-4 py-2 text-slate-700 hover:text-slate-900"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push("/sign-up")}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block px-4 py-2 bg-violet-100 text-violet-700 rounded-full text-sm font-medium mb-6">
            ⚡ AI-Powered Financial Insights
          </div>

          <h2 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Turn Bank Statements into
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Actionable Insights
            </span>
          </h2>

          <p className="text-xl text-slate-600 mb-10">
            Upload your PDF bank statements and get instant categorization,
            spending analysis, and smart recommendations. No manual work needed.
          </p>

          <button
            onClick={() => router.push("/sign-up")}
            className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 text-white rounded-xl hover:bg-violet-700 text-lg font-medium shadow-lg shadow-violet-600/30 hover:shadow-xl hover:shadow-violet-600/40 transition-all"
          >
            Start For Free
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-sm text-slate-500 mt-4">
            No credit card required · Free forever
          </p>
        </div>

        {/* Features */}
        <div className="max-w-5xl mx-auto mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-violet-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Auto-Categorization
            </h3>
            <p className="text-slate-600">
              AI automatically categorizes 95% of your transactions. Just upload
              and relax.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Smart Insights
            </h3>
            <p className="text-slate-600">
              Detect spending spikes, recurring expenses, and unusual
              transactions automatically.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Secure & Private
            </h3>
            <p className="text-slate-600">
              Bank-grade encryption. Your data stays private and secure. We
              never sell your info.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
