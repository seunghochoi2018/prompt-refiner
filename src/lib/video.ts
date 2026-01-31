// Video frame extraction for analysis
// Note: Requires ffmpeg installed on the system

import { spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

const TEMP_DIR = join(tmpdir(), "prompt-refiner");

// Ensure temp directory exists
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
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
  const id = randomUUID();
  const inputPath = join(TEMP_DIR, `${id}_input.mp4`);
  const outputPattern = join(TEMP_DIR, `${id}_frame_%03d.jpg`);

  try {
    // Write video to temp file
    const videoData = videoBase64.includes(",")
      ? videoBase64.split(",")[1]
      : videoBase64;
    writeFileSync(inputPath, Buffer.from(videoData, "base64"));

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
      const outputPath = join(TEMP_DIR, `${id}_frame_${i}.jpg`);

      await extractFrame(inputPath, outputPath, timestamp);

      if (existsSync(outputPath)) {
        const frameBuffer = require("fs").readFileSync(outputPath);
        frames.push({
          timestamp,
          imageBase64: `data:image/jpeg;base64,${frameBuffer.toString("base64")}`,
        });
        unlinkSync(outputPath);
      }
    }

    return frames;
  } finally {
    // Cleanup input file
    if (existsSync(inputPath)) {
      unlinkSync(inputPath);
    }
  }
}

function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);

    let output = "";
    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 10 : duration);
      } else {
        resolve(10); // Default duration if ffprobe fails
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
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-ss", timestamp.toString(),
      "-i", inputPath,
      "-vframes", "1",
      "-q:v", "2",
      outputPath,
    ]);

    ffmpeg.on("close", (code) => {
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
  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", ["-version"]);

    ffmpeg.on("close", (code) => {
      resolve(code === 0);
    });

    ffmpeg.on("error", () => {
      resolve(false);
    });
  });
}
