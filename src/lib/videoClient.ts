// Client-side video frame extraction using Canvas API
// Works in browser without ffmpeg

export interface VideoFrame {
  timestamp: number;
  imageBase64: string;
}

/**
 * Extract frames from video in browser using Canvas
 */
export async function extractFramesInBrowser(
  videoFile: File | string,
  numFrames: number = 5
): Promise<VideoFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    // Create object URL or use provided URL
    const videoUrl = typeof videoFile === "string"
      ? videoFile
      : URL.createObjectURL(videoFile);

    video.src = videoUrl;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const interval = duration / (numFrames + 1);
      const timestamps = Array.from(
        { length: numFrames },
        (_, i) => (i + 1) * interval
      );

      const frames: VideoFrame[] = [];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      // Set canvas size to video size (max 1280px for performance)
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      for (const timestamp of timestamps) {
        try {
          const frame = await captureFrame(video, canvas, ctx, timestamp);
          frames.push(frame);
        } catch (error) {
          console.error(`Failed to capture frame at ${timestamp}s:`, error);
        }
      }

      // Cleanup
      if (typeof videoFile !== "string") {
        URL.revokeObjectURL(videoUrl);
      }

      resolve(frames);
    };

    video.onerror = () => {
      reject(new Error("Failed to load video"));
    };

    // Start loading
    video.load();
  });
}

function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  timestamp: number
): Promise<VideoFrame> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);

      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);

      resolve({
        timestamp,
        imageBase64,
      });
    };

    video.addEventListener("seeked", onSeeked);
    video.currentTime = timestamp;

    // Timeout fallback
    setTimeout(() => {
      video.removeEventListener("seeked", onSeeked);
      reject(new Error("Seek timeout"));
    }, 5000);
  });
}

/**
 * Convert File to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
