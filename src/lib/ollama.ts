// Ollama API client for local AI inference

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

// AI 플랫폼별 프롬프트 스타일 가이드
export const PLATFORM_STYLES: Record<string, {
  name: string;
  type: "image" | "video" | "both";
  description: string;
  guidelines: string;
  example: string;
}> = {
  sora: {
    name: "Sora",
    type: "video",
    description: "OpenAI의 영상 생성 AI",
    guidelines: `- 영화적 자연어 서술 사용
- 카메라 무브먼트 명시 (dolly in, crane shot, tracking shot 등)
- 장면 분위기와 조명 상세 설명
- 시간 흐름과 동작 순서 명시
- 해상도/품질 키워드 불필요`,
    example: "A slow dolly shot following a woman walking through an autumn forest, golden sunlight filtering through the leaves, her red coat contrasting against the orange foliage, cinematic depth of field"
  },
  runway: {
    name: "Runway Gen-3",
    type: "video",
    description: "Runway의 영상 생성 AI",
    guidelines: `- 짧고 간결한 키워드 중심
- 스타일 태그 활용 (cinematic, documentary, anime 등)
- 카메라 동작 간단히 명시
- 5-15단어 권장
- 복잡한 문장 피하기`,
    example: "cinematic, woman walking forest, golden hour, tracking shot, autumn leaves falling"
  },
  pika: {
    name: "Pika",
    type: "video",
    description: "Pika Labs 영상 생성 AI",
    guidelines: `- 매우 간결한 설명 (10단어 이내 권장)
- 모션 키워드 명시 (walking, flying, spinning 등)
- 단순한 장면에 최적화
- 복잡한 카메라 무브먼트 피하기`,
    example: "woman walking through magical forest, leaves floating"
  },
  kling: {
    name: "Kling",
    type: "video",
    description: "Kuaishou의 영상 생성 AI",
    guidelines: `- 구체적인 동작 설명 필수
- 인물의 표정, 제스처 상세 기술
- 배경과 환경 명확히 설명
- 영어 프롬프트 사용 (내부 번역됨)
- 전문 모드에서는 네거티브 프롬프트 활용`,
    example: "A young woman with long black hair walks gracefully through a misty bamboo forest, her traditional hanfu dress flowing in the gentle breeze, she looks serene and contemplative"
  },
  veo: {
    name: "Veo",
    type: "video",
    description: "Google DeepMind 영상 생성 AI",
    guidelines: `- 기술적 영화 용어 활용
- 카메라 렌즈/설정 명시 가능 (35mm, shallow DOF)
- 장면 구도 상세 설명
- 자연어 서술 선호`,
    example: "35mm film, shallow depth of field, a woman in a red dress walks through an enchanted forest at golden hour, magical particles floating in the air, cinematic color grading"
  },
  midjourney: {
    name: "Midjourney",
    type: "image",
    description: "Midjourney 이미지 생성 AI",
    guidelines: `- --ar (비율), --v (버전), --stylize (스타일화) 파라미터 사용
- --no (네거티브) 파라미터로 제외 요소 지정
- 스타일 키워드 활용 (ethereal, cinematic, hyperrealistic)
- 순서대로 중요도 배치
- 쉼표로 요소 구분`,
    example: "a woman walking through an enchanted forest, magical floating lights, golden hour lighting, ethereal atmosphere, cinematic composition --ar 16:9 --v 6 --stylize 750"
  },
  dalle: {
    name: "DALL-E 3",
    type: "image",
    description: "OpenAI의 이미지 생성 AI",
    guidelines: `- 자연어 문장 선호
- 상세한 설명이 좋은 결과
- 스타일/분위기 명시
- 특수 파라미터 불필요
- 부정 지시어 사용 가능 ("without", "no")`,
    example: "A photorealistic image of a woman walking through a mystical forest filled with glowing fireflies and floating leaves, bathed in warm golden sunset light, with a dreamy ethereal atmosphere"
  },
  sd: {
    name: "Stable Diffusion",
    type: "image",
    description: "Stable Diffusion (AUTOMATIC1111/ComfyUI)",
    guidelines: `- 괄호로 가중치 조절: (중요:1.3), [덜중요]
- 품질 태그 필수: masterpiece, best quality, highres
- 네거티브 프롬프트 별도 제공
- 쉼표로 태그 구분
- LoRA/embedding 호환 고려`,
    example: "masterpiece, best quality, highres, 1girl, walking, enchanted forest, magical lights, golden hour, (flowing dress:1.2), cinematic lighting, depth of field"
  },
  flux: {
    name: "Flux",
    type: "image",
    description: "Black Forest Labs Flux",
    guidelines: `- 자연어 설명 선호
- 상세한 장면 묘사
- 스타일 키워드 후반부에
- SD보다 자연어에 강함`,
    example: "a woman gracefully walking through an ancient enchanted forest, magical golden particles floating around her, cinematic sunset lighting, photorealistic, 8k"
  }
};

export async function analyzeImageWithOllama(
  imageBase64: string,
  historicalHints: string = "",
  platform?: string
): Promise<{
  originalPrompt: string;
  issues: string[];
  refinedPrompt: string;
}> {
  // Extract base64 data if it includes the data URL prefix
  const base64Data = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  // 플랫폼별 스타일 가이드 추가
  const platformStyle = platform ? PLATFORM_STYLES[platform] : undefined;
  const platformName = platformStyle?.name || platform || "";
  const platformGuide = platformStyle
    ? `\n\nIMPORTANT: The refined prompt must follow ${platformStyle.name} prompt style:
${platformStyle.guidelines}

Example ${platformStyle.name} prompt:
"${platformStyle.example}"`
    : "";

  const systemPrompt = `You are an AI image analysis expert specializing in detecting artifacts and issues in AI-generated images.

Your task is to:
1. Estimate what prompt was likely used to generate the image
2. Identify specific issues/artifacts common in AI images (wrong fingers, face distortions, text issues, perspective problems, lighting inconsistencies, etc.)
3. Create an improved prompt that addresses these issues${platformName ? ` optimized for ${platformName}` : ""}

Be specific about issues you detect. Common problems include:
- Extra or missing fingers, malformed hands
- Asymmetric or distorted faces
- Text that looks garbled or wrong
- Inconsistent lighting or shadows
- Perspective/proportion errors
- Blurry or artifact-heavy areas
${historicalHints}${platformGuide}

Respond in JSON format only, no other text:
{
  "originalPrompt": "estimated original prompt",
  "issues": ["specific issue 1", "specific issue 2"],
  "refinedPrompt": "improved prompt with specific fixes${platformName ? ` in ${platformName} style` : ""}"
}`;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        model: "llava:7b",
        prompt: systemPrompt + "\n\nAnalyze this AI-generated image and provide improvements.",
        images: [base64Data],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data: OllamaResponse = await response.json();

    // Parse JSON from response
    const jsonMatch = data.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // If JSON parsing fails, extract info manually
        return extractFromText(data.response);
      }
    }

    return extractFromText(data.response);
  } catch (error) {
    console.error("Ollama error:", error);
    throw error;
  }
}

function extractFromText(text: string): {
  originalPrompt: string;
  issues: string[];
  refinedPrompt: string;
} {
  // Try to extract structured info from unstructured response
  const lines = text.split("\n").filter(l => l.trim());

  return {
    originalPrompt: "Unable to determine (see analysis below)",
    issues: lines.slice(0, 4).map(l => l.replace(/^[-*•]\s*/, "")),
    refinedPrompt: lines[lines.length - 1] || text.slice(0, 500),
  };
}

// Check if Ollama is running
export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Get available models
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    });
    if (!response.ok) return [];

    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch {
    return [];
  }
}

// 학습 데이터에서 유사 프롬프트 참고
export async function getTrainingExamples(platform?: string): Promise<string> {
  try {
    const { supabase, isSupabaseConfigured } = await import("./supabase");

    if (!isSupabaseConfigured || !supabase) return "";

    let query = supabase
      .from("training_data")
      .select("prompt")
      .limit(10);

    if (platform) {
      query = query.eq("platform", platform);
    }

    const { data } = await query;

    if (!data || data.length === 0) return "";

    const examples = data.map((d: { prompt: string }) => `- "${d.prompt}"`).join("\n");

    return `\n\nReference examples from successful prompts:\n${examples}`;
  } catch {
    return "";
  }
}

// 성공한 프롬프트 패턴 분석
export async function getSuccessfulPatterns(platform?: string): Promise<string> {
  try {
    const { supabase, isSupabaseConfigured } = await import("./supabase");

    if (!isSupabaseConfigured || !supabase) return "";

    let query = supabase
      .from("issue_patterns")
      .select("issue_type, successful_fixes, success_count")
      .gt("success_count", 3)
      .order("success_count", { ascending: false })
      .limit(5);

    if (platform) {
      query = query.eq("platform", platform);
    }

    const { data } = await query;

    if (!data || data.length === 0) return "";

    const patterns = data.map((p: { issue_type: string; successful_fixes: string[]; success_count: number }) =>
      `- For ${p.issue_type}: ${p.successful_fixes[0] || "N/A"} (${p.success_count} successes)`
    ).join("\n");

    return `\n\nProven fix patterns:\n${patterns}`;
  } catch {
    return "";
  }
}
