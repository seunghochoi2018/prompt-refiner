"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";

interface MediaUploaderProps {
  onUpload: (data: string, type: "image" | "video") => void;
}

export default function MediaUploader({ onUpload }: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste handler
  useEffect(() => {
    const handlePaste = (e: globalThis.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            processFile(file);
          }
          return;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    // Check for HTML files (common mistake: saving webpage instead of image)
    if (file.type === "text/html" || file.name.endsWith(".html") || file.name.endsWith(".htm")) {
      setError("This is a webpage file, not an image/video. To save properly: Right-click the image → 'Save image as...' (not 'Save page as')");
      return;
    }

    if (!isImage && !isVideo) {
      setError("Please upload an image or video file (PNG, JPG, MP4, WebM)");
      return;
    }

    // Image: 10MB limit, Video: 100MB limit
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size must be less than ${isVideo ? "100MB" : "10MB"}`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onUpload(result, isVideo ? "video" : "image");
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    setError(null);
    setIsLoadingUrl(true);

    try {
      const response = await fetch("/api/fetch-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch media from URL");
      }

      onUpload(data.imageData, "image");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load from URL");
    } finally {
      setIsLoadingUrl(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="space-y-4">
          <div className="flex justify-center gap-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-medium text-gray-700 dark:text-gray-200">
              Drop file here or click to browse
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              or <span className="font-semibold text-blue-600 dark:text-blue-400">Ctrl+V</span> to paste image
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
        <span className="text-sm text-gray-500 dark:text-gray-400">Image URL only</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleUrlSubmit}
            disabled={isLoadingUrl || !urlInput.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingUrl ? "..." : "Fetch"}
          </button>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          * Video URL is not supported. Please download and upload the file directly.
        </p>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
        <p className="font-medium text-blue-800 dark:text-blue-300 mb-2">How to upload:</p>
        <div className="space-y-3 text-blue-700 dark:text-blue-400">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded text-xs font-medium">Image</span>
            </div>
            <p className="ml-1">Right-click image → <b>&quot;Save image as...&quot;</b> → Drag file here</p>
            <p className="ml-1 text-xs text-gray-500">or: Right-click → &quot;Copy image&quot; → Ctrl+V here</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded text-xs font-medium">Video</span>
            </div>
            <p className="ml-1">Click download button on AI site → Drag .mp4 file here</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-red-500 dark:text-red-400">* Do NOT use &quot;Save page as&quot; - this saves webpage, not the image/video</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
