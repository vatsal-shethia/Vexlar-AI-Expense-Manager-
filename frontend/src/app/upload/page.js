"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { statementAPI } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const response = await statementAPI.upload(file);
      setResult(response.data);

      // Redirect to transactions after 2 seconds
      setTimeout(() => {
        router.push(`/transactions?statement=${response.data.statement.id}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Vexlar
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Upload Bank Statement
          </h2>
          <p className="text-slate-600">
            Upload your PDF statement and we'll categorize all transactions
            automatically
          </p>
        </div>

        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragActive
                ? "border-violet-500 bg-violet-50"
                : "border-slate-300 bg-white hover:border-violet-400 hover:bg-slate-50"
            }
            ${uploading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input {...getInputProps()} />

          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 mx-auto text-violet-600 animate-spin" />
              <p className="text-lg font-medium text-slate-700">
                Processing your statement...
              </p>
              <p className="text-sm text-slate-500">
                Parsing PDF and categorizing transactions
              </p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
              <p className="text-lg font-medium text-slate-900">
                Statement processed successfully!
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-left">
                <p className="font-medium text-green-900 mb-2">
                  {result.statement.fileName}
                </p>
                <div className="space-y-1 text-green-700">
                  <p>
                    ✓ {result.statement.transactionsCount} transactions found
                  </p>
                  <p>
                    ✓ {result.statement.categorizationStats?.categorized || 0}{" "}
                    automatically categorized
                  </p>
                  <p>✓ Bank: {result.statement.bankName}</p>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Redirecting to transactions...
              </p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <XCircle className="w-16 h-16 mx-auto text-red-600" />
              <p className="text-lg font-medium text-slate-900">
                Upload failed
              </p>
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Upload className="w-16 h-16 mx-auto text-violet-600" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center">
                  <FileText className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium text-slate-900 mb-1">
                  {isDragActive
                    ? "Drop your statement here"
                    : "Drag & drop your statement"}
                </p>
                <p className="text-sm text-slate-500">or click to browse</p>
              </div>
              <p className="text-xs text-slate-400">
                Supports PDF statements from HDFC, ICICI, SBI, Kotak, and more
              </p>
            </div>
          )}
        </div>

        {/* Info Cards */}
        {!uploading && !result && !error && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
              <div className="text-2xl font-bold text-violet-600 mb-1">⚡</div>
              <p className="text-xs text-slate-600">Auto-categorized</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
              <div className="text-2xl font-bold text-violet-600 mb-1">🔒</div>
              <p className="text-xs text-slate-600">Secure & Private</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
              <div className="text-2xl font-bold text-violet-600 mb-1">🎯</div>
              <p className="text-xs text-slate-600">AI-Powered</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
