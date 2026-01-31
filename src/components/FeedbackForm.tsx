"use client";

import { useState } from "react";

interface FeedbackFormProps {
  analysisId: string;
  onFeedbackSubmit?: () => void;
}

export default function FeedbackForm({ analysisId, onFeedbackSubmit }: FeedbackFormProps) {
  const [worked, setWorked] = useState<boolean | null>(null);
  const [score, setScore] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [issueStillPresent, setIssueStillPresent] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commonIssues = [
    "Hands still wrong",
    "Face still distorted",
    "Text artifacts remain",
    "Lighting still off",
    "Prompt too different from original intent",
    "New issues appeared",
  ];

  const toggleIssue = (issue: string) => {
    setIssueStillPresent(prev =>
      prev.includes(issue)
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  const handleSubmit = async () => {
    if (worked === null) return;

    setIsSubmitting(true);

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          worked,
          score: score > 0 ? score : undefined,
          comment: comment.trim() || undefined,
          issuesRemaining: issueStillPresent.length > 0 ? issueStillPresent : undefined,
        }),
      });

      setSubmitted(true);
      onFeedbackSubmit?.();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
        <p className="text-green-700 dark:text-green-300 font-medium">
          Thank you for your feedback!
        </p>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          Your input helps us improve recommendations for everyone.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
      <h4 className="font-medium text-gray-900 dark:text-white">
        Did the refined prompt work better?
      </h4>

      {/* Yes/No Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setWorked(true)}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
            worked === true
              ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              : "border-gray-200 dark:border-gray-600 hover:border-green-300 text-gray-600 dark:text-gray-300"
          }`}
        >
          Yes, it improved!
        </button>
        <button
          onClick={() => setWorked(false)}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
            worked === false
              ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              : "border-gray-200 dark:border-gray-600 hover:border-red-300 text-gray-600 dark:text-gray-300"
          }`}
        >
          No, still issues
        </button>
      </div>

      {/* If worked - Rating */}
      {worked === true && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Rate the improvement (optional):
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setScore(star)}
                className={`text-2xl transition-transform hover:scale-110 ${
                  star <= score ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"
                }`}
              >
                *
              </button>
            ))}
          </div>
        </div>
      )}

      {/* If NOT worked - Get details */}
      {worked === false && (
        <div className="space-y-4">
          {/* What issues remain */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              What issues still remain? (select all that apply)
            </p>
            <div className="flex flex-wrap gap-2">
              {commonIssues.map((issue) => (
                <button
                  key={issue}
                  onClick={() => toggleIssue(issue)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                    issueStillPresent.includes(issue)
                      ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                  }`}
                >
                  {issue}
                </button>
              ))}
            </div>
          </div>

          {/* Text feedback */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tell us more (optional):
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g., The hands now have 5 fingers but they look unnatural, or the prompt changed the style too much..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Optional comment for positive feedback too */}
      {worked === true && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            What worked well? (optional)
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g., The hand issue was fixed perfectly, lighting is much better now..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={2}
          />
        </div>
      )}

      {/* Submit Button */}
      {worked !== null && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </button>
      )}
    </div>
  );
}
