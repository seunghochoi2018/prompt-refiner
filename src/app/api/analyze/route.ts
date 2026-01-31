import { NextRequest, NextResponse } from "next/server";
import { saveAnalysis, generateImageHash, getBestFixes } from "@/lib/database";
import { analyzeImageWithOllama, checkOllamaStatus } from "@/lib/ollama";

interface VideoFrame {
  timestamp: number;
  imageBase64: string;
}

export async function POST(request: NextRequest) {
  try {
    const { image, videoFrames, platform } = await request.json();

    if (!image && !videoFrames) {
      return NextResponse.json(
        { error: "No image or video provided" },
        { status: 400 }
      );
    }

    // Handle video frames (extracted in browser)
    if (videoFrames && Array.isArray(videoFrames) && videoFrames.length > 0) {
      const frames = videoFrames as VideoFrame[];

      // Analyze each frame
      const frameAnalyses = [];
      const historicalFixes = await getHistoricalPatterns();

      for (const frame of frames) {
        try {
          const analysis = await analyzeMedia(frame.imageBase64, historicalFixes, platform);
          frameAnalyses.push({
            timestamp: frame.timestamp,
            ...analysis,
          });
        } catch (error) {
          console.error(`Frame analysis error at ${frame.timestamp}s:`, error);
        }
      }

      // Combine analyses
      const combinedResult = combineVideoAnalyses(frameAnalyses);

      // Save to database
      let analysisId: string | undefined;
      try {
        const saved = await saveAnalysis({
          image_hash: await generateImageHash(frames[0]?.imageBase64 || ""),
          platform: platform || undefined,
          detected_issues: combinedResult.issues,
          original_prompt_guess: combinedResult.originalPrompt,
          refined_prompt: combinedResult.refinedPrompt,
          metadata: { type: "video", frameCount: frames.length },
        });
        analysisId = saved?.id;
      } catch (dbError) {
        console.error("Database save error:", dbError);
      }

      return NextResponse.json({
        ...combinedResult,
        analysisId,
        frameAnalyses,
      });
    }

    // Handle image
    const historicalFixes = await getHistoricalPatterns();
    const result = await analyzeMedia(image, historicalFixes, platform);

    // Save to database
    let analysisId: string | undefined;
    try {
      const saved = await saveAnalysis({
        image_hash: await generateImageHash(image),
        platform: platform || undefined,
        detected_issues: result.issues,
        original_prompt_guess: result.originalPrompt,
        refined_prompt: result.refinedPrompt,
      });
      analysisId = saved?.id;
    } catch (dbError) {
      console.error("Database save error:", dbError);
    }

    return NextResponse.json({
      ...result,
      analysisId,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze media" },
      { status: 500 }
    );
  }
}

async function analyzeMedia(
  imageBase64: string,
  historicalHints: string,
  platform?: string
): Promise<{
  originalPrompt: string;
  issues: string[];
  refinedPrompt: string;
}> {
  // Check if Ollama is running (local development)
  const ollamaRunning = await checkOllamaStatus();

  if (ollamaRunning) {
    // Use local Ollama (free)
    return await analyzeImageWithOllama(imageBase64, historicalHints, platform);
  }

  // Try Google Gemini (free tier)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return await analyzeWithGemini(imageBase64, geminiKey, historicalHints, platform);
  }

  // Fallback: Check for OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    return await analyzeWithOpenAI(imageBase64, apiKey, historicalHints);
  }

  // Demo mode: return sample response
  return {
    originalPrompt: "A woman walking in a forest with magical lights",
    issues: [
      "Hands have incorrect number of fingers (6 visible)",
      "Face asymmetry detected in left eye area",
      "Lighting inconsistency between foreground and background",
      "Text artifact visible in lower right corner",
    ],
    refinedPrompt:
      "A woman walking in an enchanted forest with magical floating lights, full body shot from behind to avoid face/hand issues, soft diffused lighting throughout the scene, cinematic composition, no text, 8k resolution, photorealistic --ar 16:9 --v 6",
  };
}

async function analyzeWithGemini(
  imageBase64: string,
  apiKey: string,
  historicalHints: string,
  platform?: string
) {
  const base64Data = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  const prompt = `You are an AI image analysis expert. Analyze this AI-generated image and provide SPECIFIC, ACTIONABLE fixes.

Your task is to:
1. Estimate what prompt was likely used
2. Identify specific issues (wrong fingers, face distortions, lighting problems, etc.)
3. Provide a COMPLETE refined prompt with specific fix keywords

IMPORTANT - Add these SPECIFIC keywords to fix common issues:
- Hand/finger issues → add: "anatomically correct hands, five fingers, detailed hands"
- Face distortion → add: "symmetrical face, detailed facial features, portrait quality"
- Lighting issues → add: "consistent lighting, single light source, soft shadows"
- Perspective errors → add: "correct perspective, proper proportions"
- Blurry areas → add: "sharp focus, high detail, 8k resolution"
- Text artifacts → add: "no text, no watermarks, clean image"

The refinedPrompt must be COMPLETE and READY-TO-USE:
1. Original scene description
2. All fix keywords for detected issues
3. Quality boosters: "highly detailed, professional quality, masterpiece"
${historicalHints}

Respond in JSON format only:
{
  "originalPrompt": "estimated original prompt",
  "issues": ["specific issue 1", "specific issue 2"],
  "refinedPrompt": "COMPLETE prompt: [scene] + [fix keywords] + [quality boosters]"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No JSON found");
  } catch {
    return {
      originalPrompt: "Unable to determine",
      issues: ["Analysis completed but response format was unexpected"],
      refinedPrompt: content || "Please try again",
    };
  }
}

async function analyzeWithOpenAI(
  imageBase64: string,
  apiKey: string,
  historicalHints: string
) {
  const base64Data = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  const systemPrompt = `You are an AI image analysis expert specializing in detecting artifacts and issues in AI-generated images.

Your task is to:
1. Estimate what prompt was likely used to generate the image
2. Identify specific issues/artifacts common in AI images
3. Create an improved prompt that addresses these issues
${historicalHints}

Respond in JSON format:
{
  "originalPrompt": "estimated original prompt",
  "issues": ["specific issue 1", "specific issue 2"],
  "refinedPrompt": "improved prompt with specific fixes"
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this AI-generated image." },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Data}`, detail: "low" },
            },
          ],
        },
      ],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  try {
    return JSON.parse(content);
  } catch {
    return {
      originalPrompt: "Unable to determine",
      issues: ["Analysis completed but response format was unexpected"],
      refinedPrompt: content || "Please try again",
    };
  }
}

function combineVideoAnalyses(
  frameAnalyses: Array<{
    timestamp: number;
    originalPrompt: string;
    issues: string[];
    refinedPrompt: string;
  }>
): {
  originalPrompt: string;
  issues: string[];
  refinedPrompt: string;
} {
  if (frameAnalyses.length === 0) {
    return {
      originalPrompt: "Unable to analyze video",
      issues: ["No frames could be analyzed"],
      refinedPrompt: "Please try with a different video",
    };
  }

  // Combine issues from all frames (deduplicated)
  const allIssues = new Set<string>();
  frameAnalyses.forEach((fa) => fa.issues.forEach((i) => allIssues.add(i)));

  // Use the most common prompt guess or first one
  const promptCounts = new Map<string, number>();
  frameAnalyses.forEach((fa) => {
    promptCounts.set(fa.originalPrompt, (promptCounts.get(fa.originalPrompt) || 0) + 1);
  });
  const mostCommonPrompt = [...promptCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // Combine refined prompts or use the one from the middle frame
  const middleIndex = Math.floor(frameAnalyses.length / 2);
  const refinedPrompt = frameAnalyses[middleIndex]?.refinedPrompt || "";

  return {
    originalPrompt: mostCommonPrompt || frameAnalyses[0].originalPrompt,
    issues: Array.from(allIssues).slice(0, 10), // Max 10 issues
    refinedPrompt: refinedPrompt + " --video consistent frames, smooth motion",
  };
}

async function getHistoricalPatterns(): Promise<string> {
  try {
    const handFixes = await getBestFixes("hand_issues");
    const faceFixes = await getBestFixes("face_distortion");
    const textFixes = await getBestFixes("text_artifact");

    const patterns: string[] = [];

    if (handFixes.length > 0 && handFixes[0].success_count > 5) {
      patterns.push(
        `For hand issues: Users report success with hiding hands, using back views, or "anatomically correct hands"`
      );
    }
    if (faceFixes.length > 0 && faceFixes[0].success_count > 5) {
      patterns.push(
        `For face issues: Users report success with "symmetrical face", profile views, or "high detail face"`
      );
    }
    if (textFixes.length > 0 && textFixes[0].success_count > 5) {
      patterns.push(
        `For text artifacts: Users report success by adding "no text, no letters, no watermarks"`
      );
    }

    return patterns.length > 0
      ? `\n\nHistorical successful patterns:\n${patterns.join("\n")}`
      : "";
  } catch {
    return "";
  }
}
