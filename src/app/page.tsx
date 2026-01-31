"use client";

import { useState } from "react";
import MediaUploader from "@/components/MediaUploader";
import AnalysisResult from "@/components/AnalysisResult";
import { extractFramesInBrowser } from "@/lib/videoClient";

const AI_PLATFORMS = {
  image: [
    { id: "midjourney", name: "Midjourney" },
    { id: "dalle", name: "DALL-E 3" },
    { id: "sd", name: "Stable Diffusion" },
    { id: "flux", name: "Flux" },
  ],
  video: [
    { id: "sora", name: "Sora" },
    { id: "runway", name: "Runway Gen-3" },
    { id: "pika", name: "Pika" },
    { id: "kling", name: "Kling" },
    { id: "veo", name: "Veo" },
  ],
};

export default function Home() {
  const [mediaData, setMediaData] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [platform, setPlatform] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    originalPrompt: string;
    issues: string[];
    refinedPrompt: string;
    analysisId?: string;
    frameAnalyses?: Array<{
      timestamp: number;
      originalPrompt: string;
      issues: string[];
      refinedPrompt: string;
    }>;
  } | null>(null);

  const handleMediaUpload = async (data: string, type: "image" | "video") => {
    setMediaData(data);
    setMediaType(type);
    setIsAnalyzing(true);
    setResult(null);

    try {
      let requestBody: Record<string, unknown>;

      if (type === "video") {
        // Extract frames in browser (no server-side ffmpeg needed)
        const frames = await extractFramesInBrowser(data, 5);
        if (frames.length === 0) {
          throw new Error("Failed to extract frames from video");
        }
        requestBody = {
          videoFrames: frames,
          platform: platform || undefined,
        };
      } else {
        requestBody = {
          image: data,
          platform: platform || undefined,
        };
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Analysis failed");
      }

      const analysisResult = await response.json();
      setResult(analysisResult);
    } catch (error) {
      console.error("Analysis error:", error);
      setResult({
        originalPrompt: "Analysis failed",
        issues: [error instanceof Error ? error.message : "Unknown error occurred"],
        refinedPrompt: "Please try again with a different file",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setMediaData(null);
    setResult(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Prompt Refiner
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Fix awkward AI-generated images and videos with better prompts
          </p>
        </header>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
          {!mediaData ? (
            <div className="space-y-6">
              {/* AI Platform Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Target AI Platform (for optimized prompt style)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Image AIs */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Image</p>
                    <div className="flex flex-wrap gap-2">
                      {AI_PLATFORMS.image.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPlatform(platform === p.id ? "" : p.id)}
                          className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                            platform === p.id
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Video AIs */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Video</p>
                    <div className="flex flex-wrap gap-2">
                      {AI_PLATFORMS.video.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPlatform(platform === p.id ? "" : p.id)}
                          className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                            platform === p.id
                              ? "bg-purple-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {!platform && (
                  <p className="text-xs text-gray-400 mt-2">Select a platform for optimized prompt style, or skip for generic prompt</p>
                )}
              </div>

              <MediaUploader onUpload={handleMediaUpload} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview */}
              <div className="flex justify-center">
                {mediaType === "video" ? (
                  <video
                    src={mediaData}
                    controls
                    className="max-h-64 rounded-lg shadow-md"
                  />
                ) : (
                  <img
                    src={mediaData}
                    alt="Uploaded media"
                    className="max-h-64 rounded-lg shadow-md"
                  />
                )}
              </div>

              {/* Analysis Result */}
              {isAnalyzing ? (
                <div className="flex flex-col items-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-300">
                    {mediaType === "video"
                      ? "Extracting frames and analyzing..."
                      : "Analyzing your image..."}
                  </p>
                  {mediaType === "video" && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      This may take a moment for videos
                    </p>
                  )}
                </div>
              ) : result ? (
                <>
                  <AnalysisResult result={result} />

                  {/* Video Frame Analysis */}
                  {result.frameAnalyses && result.frameAnalyses.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        Frame-by-Frame Analysis
                      </h3>
                      <div className="space-y-2">
                        {result.frameAnalyses.map((frame, index) => (
                          <details
                            key={index}
                            className="bg-white dark:bg-gray-800 rounded-lg p-3"
                          >
                            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                              Frame at {frame.timestamp.toFixed(1)}s - {frame.issues.length} issues
                            </summary>
                            <div className="mt-2 pl-4 text-sm text-gray-600 dark:text-gray-400">
                              <ul className="list-disc list-inside">
                                {frame.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}

              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Upload Another File
              </button>
            </div>
          )}
        </div>

        {/* Supported Platforms */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Works with all major AI generators
          </p>
          <div className="flex justify-center gap-6 flex-wrap text-gray-400 dark:text-gray-500">
            <span>Midjourney</span>
            <span>DALL-E</span>
            <span>Stable Diffusion</span>
            <span>Sora</span>
            <span>Runway</span>
            <span>Pika</span>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-gray-400 space-y-2">
          <p>&copy; {new Date().getFullYear()} Prompt Refiner by Mike. All rights reserved.</p>
          <div className="flex justify-center gap-4">
            <a href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300">Privacy Policy</a>
            <a href="/terms" className="hover:text-gray-600 dark:hover:text-gray-300">Terms of Service</a>
            <a href="/feedback" className="hover:text-gray-600 dark:hover:text-gray-300">Feedback</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
