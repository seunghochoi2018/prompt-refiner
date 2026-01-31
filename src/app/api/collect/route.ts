import { NextRequest, NextResponse } from "next/server";
import { collectAllData, analyzeTrainingPatterns } from "@/lib/dataCollector";

// 데이터 수집 API (Cron Job으로 호출)
export async function GET(request: NextRequest) {
  // 간단한 인증 (Vercel Cron 또는 수동 호출)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Vercel Cron에서 호출하거나 시크릿이 일치하면 허용
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Vercel Cron 헤더 체크
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";
    if (!isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // 데이터 수집
    const result = await collectAllData();

    // 패턴 분석
    const patterns = await analyzeTrainingPatterns();

    return NextResponse.json({
      success: true,
      collected: result.total,
      saved: result.saved,
      topKeywords: Object.keys(patterns.commonKeywords).slice(0, 20),
    });
  } catch (error) {
    console.error("Collection error:", error);
    return NextResponse.json(
      { error: "Collection failed" },
      { status: 500 }
    );
  }
}

// 수동으로 특정 소스에서 수집
export async function POST(request: NextRequest) {
  try {
    const { source, query, limit } = await request.json();

    let result;

    if (source === "lexica") {
      const { fetchFromLexica, saveTrainingData } = await import("@/lib/dataCollector");
      const pairs = await fetchFromLexica(query || "art", limit || 50);
      const saved = await saveTrainingData(pairs);
      result = { source, collected: pairs.length, saved };
    } else if (source === "reddit") {
      const { fetchFromReddit, saveTrainingData } = await import("@/lib/dataCollector");
      const pairs = await fetchFromReddit(query || "midjourney", limit || 50);
      const saved = await saveTrainingData(pairs);
      result = { source, collected: pairs.length, saved };
    } else if (source === "civitai") {
      const { fetchFromCivitai, saveTrainingData } = await import("@/lib/dataCollector");
      const pairs = await fetchFromCivitai(query || "", limit || 50);
      const saved = await saveTrainingData(pairs);
      result = { source, collected: pairs.length, saved };
    } else {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Collection error:", error);
    return NextResponse.json(
      { error: "Collection failed" },
      { status: 500 }
    );
  }
}
