"use client";

import { useState } from "react";
import FeedbackForm from "./FeedbackForm";

interface AnalysisResultProps {
  result: {
    originalPrompt: string;
    issues: string[];
    refinedPrompt: string;
    analysisId?: string;
  };
}

export default function AnalysisResult({ result }: AnalysisResultProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result.refinedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Estimated Original Prompt */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Estimated Original Prompt
        </h3>
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-700 dark:text-gray-200 italic">
            &ldquo;{result.originalPrompt}&rdquo;
          </p>
        </div>
      </div>

      {/* Issues Found */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Issues Detected
        </h3>
        <ul className="space-y-2">
          {result.issues.map((issue, index) => (
            <li
              key={index}
              className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
            >
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-amber-800 dark:text-amber-200">{issue}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Refined Prompt */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Refined Prompt
        </h3>
        <div className="relative">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg pr-12">
            <p className="text-gray-800 dark:text-gray-100">
              {result.refinedPrompt}
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          Pro Tips
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>Copy the refined prompt and use it in your AI image generator</li>
          <li>Adjust specific details like lighting, style, or composition as needed</li>
          <li>Multiple iterations may be needed for best results</li>
        </ul>
      </div>

      {/* Feedback Form */}
      <FeedbackForm analysisId={result.analysisId} />
    </div>
  );
}
