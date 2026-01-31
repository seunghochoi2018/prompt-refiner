// 공개 데이터셋에서 프롬프트+이미지 쌍 수집
// Lexica, Reddit 등에서 학습 데이터 수집

import { supabase, isSupabaseConfigured } from "./supabase";

interface PromptImagePair {
  prompt: string;
  imageUrl: string;
  source: string;
  platform?: string;
  metadata?: Record<string, unknown>;
}

// Lexica API - Stable Diffusion 이미지 검색
export async function fetchFromLexica(query: string, limit: number = 50): Promise<PromptImagePair[]> {
  try {
    const response = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      console.error("Lexica API error:", response.status);
      return [];
    }

    const data = await response.json();
    const images = data.images || [];

    return images.slice(0, limit).map((img: { prompt: string; src: string; model?: string }) => ({
      prompt: img.prompt,
      imageUrl: img.src,
      source: "lexica",
      platform: "stable_diffusion",
      metadata: { model: img.model },
    }));
  } catch (error) {
    console.error("Lexica fetch error:", error);
    return [];
  }
}

// Reddit API - r/midjourney, r/StableDiffusion 등에서 수집
export async function fetchFromReddit(subreddit: string, limit: number = 50): Promise<PromptImagePair[]> {
  try {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
      {
        headers: {
          "User-Agent": "PromptRefiner/1.0",
        },
      }
    );

    if (!response.ok) {
      console.error("Reddit API error:", response.status);
      return [];
    }

    const data = await response.json();
    const posts = data.data?.children || [];

    const results: PromptImagePair[] = [];

    for (const post of posts) {
      const postData = post.data;

      // 이미지가 있는 포스트만
      if (!postData.url || !isImageUrl(postData.url)) continue;

      // 제목에서 프롬프트 추출 시도
      const prompt = extractPromptFromTitle(postData.title);
      if (!prompt) continue;

      results.push({
        prompt,
        imageUrl: postData.url,
        source: `reddit_${subreddit}`,
        platform: subredditToPlatform(subreddit),
        metadata: {
          postId: postData.id,
          score: postData.score,
          author: postData.author,
        },
      });
    }

    return results;
  } catch (error) {
    console.error("Reddit fetch error:", error);
    return [];
  }
}

// Civitai API - 모델과 이미지
export async function fetchFromCivitai(query: string, limit: number = 50): Promise<PromptImagePair[]> {
  try {
    const response = await fetch(
      `https://civitai.com/api/v1/images?limit=${limit}&sort=Most%20Reactions&nsfw=false`
    );

    if (!response.ok) {
      console.error("Civitai API error:", response.status);
      return [];
    }

    const data = await response.json();
    const images = data.items || [];

    return images
      .filter((img: { meta?: { prompt?: string } }) => img.meta?.prompt)
      .map((img: { meta: { prompt: string }; url: string; id: number; stats: { likeCount: number } }) => ({
        prompt: img.meta.prompt,
        imageUrl: img.url,
        source: "civitai",
        platform: "stable_diffusion",
        metadata: {
          imageId: img.id,
          likes: img.stats?.likeCount,
        },
      }));
  } catch (error) {
    console.error("Civitai fetch error:", error);
    return [];
  }
}

// 수집한 데이터를 Supabase에 저장
export async function saveTrainingData(pairs: PromptImagePair[]): Promise<number> {
  if (!isSupabaseConfigured || !supabase) {
    console.log("Supabase not configured");
    return 0;
  }

  let saved = 0;

  for (const pair of pairs) {
    try {
      // 중복 체크
      const { data: existing } = await supabase
        .from("training_data")
        .select("id")
        .eq("image_url", pair.imageUrl)
        .maybeSingle();

      if (existing) continue;

      const { error } = await supabase.from("training_data").insert({
        prompt: pair.prompt,
        image_url: pair.imageUrl,
        source: pair.source,
        platform: pair.platform,
        metadata: pair.metadata,
      });

      if (!error) saved++;
    } catch (error) {
      // 무시하고 계속
    }
  }

  return saved;
}

// 학습 데이터에서 패턴 분석
export async function analyzeTrainingPatterns(): Promise<{
  commonKeywords: Record<string, number>;
  platformPatterns: Record<string, string[]>;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { commonKeywords: {}, platformPatterns: {} };
  }

  const { data } = await supabase
    .from("training_data")
    .select("prompt, platform")
    .limit(1000);

  if (!data) return { commonKeywords: {}, platformPatterns: {} };

  // 키워드 빈도 분석
  const keywords: Record<string, number> = {};
  const platformPatterns: Record<string, string[]> = {};

  for (const item of data) {
    const words = item.prompt.toLowerCase().split(/[\s,]+/);

    for (const word of words) {
      if (word.length > 3) {
        keywords[word] = (keywords[word] || 0) + 1;
      }
    }

    // 플랫폼별 패턴
    if (item.platform) {
      if (!platformPatterns[item.platform]) {
        platformPatterns[item.platform] = [];
      }
      platformPatterns[item.platform].push(item.prompt);
    }
  }

  // 상위 키워드만
  const sortedKeywords = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

  return {
    commonKeywords: sortedKeywords,
    platformPatterns,
  };
}

// 모든 소스에서 데이터 수집
export async function collectAllData(): Promise<{ total: number; saved: number }> {
  const allPairs: PromptImagePair[] = [];

  // Lexica에서 다양한 쿼리로 수집
  const lexicaQueries = ["portrait", "landscape", "fantasy", "cyberpunk", "anime", "photorealistic"];
  for (const query of lexicaQueries) {
    const pairs = await fetchFromLexica(query, 20);
    allPairs.push(...pairs);
  }

  // Reddit에서 수집
  const subreddits = ["midjourney", "StableDiffusion", "dalle2"];
  for (const sub of subreddits) {
    const pairs = await fetchFromReddit(sub, 30);
    allPairs.push(...pairs);
  }

  // Civitai에서 수집
  const civitaiPairs = await fetchFromCivitai("", 50);
  allPairs.push(...civitaiPairs);

  // 저장
  const saved = await saveTrainingData(allPairs);

  return { total: allPairs.length, saved };
}

// 헬퍼 함수들
function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) ||
         url.includes("i.redd.it") ||
         url.includes("imgur.com");
}

function extractPromptFromTitle(title: string): string | null {
  // [프롬프트] 형식
  const bracketMatch = title.match(/\[([^\]]+)\]/);
  if (bracketMatch) return bracketMatch[1];

  // "prompt: ..." 형식
  const promptMatch = title.match(/prompt[:\s]+(.+)/i);
  if (promptMatch) return promptMatch[1];

  // 제목이 충분히 길면 프롬프트로 간주
  if (title.length > 30 && !title.includes("?")) {
    return title;
  }

  return null;
}

function subredditToPlatform(subreddit: string): string {
  const map: Record<string, string> = {
    midjourney: "midjourney",
    StableDiffusion: "stable_diffusion",
    dalle2: "dalle",
    dalle: "dalle",
  };
  return map[subreddit] || "unknown";
}
