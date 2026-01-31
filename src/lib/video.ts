// Video frame extraction for analysis
// Note: Requires ffmpeg installed on the system
// This module only works in Node.js server environment

let spawn: typeof import("child_process").spawn;
let fs: typeof import("fs");
let path: typeof import("path");
let os: typeof import("os");
let crypto: typeof import("crypto");

function getTempDir(): string {
  if (!fs) fs = require("fs");
  if (!path) path = require("path");
  if (!os) os = require("os");

  const tempDir = path.join(os.tmpdir(), "prompt-refiner");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

export interface VideoFrame {
  timestamp: number; // seconds
  imageBase64: string;
}

/**
 * Extract key frames from a video for analysis
 * @param videoBase64 - Base64 encoded video data
 * @param numFrames - Number of frames to extract (default: 5)
 * @returns Array of extracted frames as base64 images
 */
export async function extractVideoFrames(
  videoBase64: string,
  numFrames: number = 5
): Promise<VideoFrame[]> {
  // Lazy load Node.js modules
  if (!fs) fs = require("fs");
  if (!path) path = require("path");
  if (!crypto) crypto = require("crypto");

  const TEMP_DIR = getTempDir();
  const id = crypto.randomUUID();
  const inputPath = path.join(TEMP_DIR, `${id}_input.mp4`);

  try {
    // Write video to temp file
    const videoData = videoBase64.includes(",")
      ? videoBase64.split(",")[1]
      : videoBase64;
    fs.writeFileSync(inputPath, Buffer.from(videoData, "base64"));

    // Get video duration
    const duration = await getVideoDuration(inputPath);

    // Calculate frame timestamps (evenly distributed)
    const interval = duration / (numFrames + 1);
    const timestamps = Array.from(
      { length: numFrames },
      (_, i) => (i + 1) * interval
    );

    // Extract frames using ffmpeg
    const frames: VideoFrame[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const outputPath = path.join(TEMP_DIR, `${id}_frame_${i}.jpg`);

      await extractFrame(inputPath, outputPath, timestamp);

      if (fs.existsSync(outputPath)) {
        const frameBuffer = fs.readFileSync(outputPath);
        frames.push({
          timestamp,
          imageBase64: `data:image/jpeg;base64,${frameBuffer.toString("base64")}`,
        });
        fs.unlinkSync(outputPath);
      }
    }

    return frames;
  } finally {
    // Cleanup input file
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
  }
}

function getVideoDuration(inputPath: string): Promise<number> {
  if (!spawn) spawn = require("child_process").spawn;

  return new Promise((resolve) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);

    let output = "";
    ffprobe.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    ffprobe.on("close", (code: number) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 10 : duration);
      } else {
        resolve(10);
      }
    });

    ffprobe.on("error", () => {
      resolve(10);
    });
  });
}

function extractFrame(
  inputPath: string,
  outputPath: string,
  timestamp: number
): Promise<void> {
  if (!spawn) spawn = require("child_process").spawn;

  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-ss", timestamp.toString(),
      "-i", inputPath,
      "-vframes", "1",
      "-q:v", "2",
      outputPath,
    ]);

    ffmpeg.on("close", () => {
      resolve();
    });

    ffmpeg.on("error", () => {
      resolve();
    });
  });
}

/**
 * Check if ffmpeg is available
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  // Vercel serverless doesn't have ffmpeg
  if (process.env.VERCEL) {
    return false;
  }

  if (!spawn) spawn = require("child_process").spawn;

  return new Promise((resolve) => {
    try {
      const ffmpeg = spawn("ffmpeg", ["-version"]);

      ffmpeg.on("close", (code: number) => {
        resolve(code === 0);
      });

      ffmpeg.on("error", () => {
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}
