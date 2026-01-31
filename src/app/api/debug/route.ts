import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// 디버깅/모니터링 API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "status";

  try {
    switch (action) {
      case "status":
        return await getSystemStatus();
      case "stats":
        return await getStats();
      case "recent":
        return await getRecentData();
      case "errors":
        return await getRecentErrors();
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      error: "Debug error",
      details: error instanceof Error ? error.message : "Unknown",
    }, { status: 500 });
  }
}

// 시스템 상태 확인
async function getSystemStatus() {
  const status = {
    timestamp: new Date().toISOString(),
    supabase: {
      configured: isSupabaseConfigured,
      connected: false,
    },
    tables: {
      analyses: { exists: false, count: 0 },
      training_data: { exists: false, count: 0 },
      issue_patterns: { exists: false, count: 0 },
    },
    environment: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
    },
  };

  if (isSupabaseConfigured && supabase) {
    try {
      // 연결 테스트
      const { error: connError } = await supabase.from("analyses").select("id").limit(1);
      status.supabase.connected = !connError;

      // 테이블별 카운트
      const tables = ["analyses", "training_data", "issue_patterns"] as const;
      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        status.tables[table] = {
          exists: !error,
          count: count || 0,
        };
      }
    } catch (e) {
      console.error("Status check error:", e);
    }
  }

  return NextResponse.json(status);
}

// 통계 정보
async function getStats() {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ error: "Supabase not configured" });
  }

  const stats = {
    analyses: {
      total: 0,
      withFeedback: 0,
      successRate: 0,
      byPlatform: {} as Record<string, number>,
    },
    training: {
      total: 0,
      bySource: {} as Record<string, number>,
      byPlatform: {} as Record<string, number>,
    },
    patterns: {
      total: 0,
      topIssues: [] as { type: string; count: number; successRate: number }[],
    },
  };

  // Analyses 통계
  const { data: analysesData } = await supabase.from("analyses").select("*");
  if (analysesData) {
    stats.analyses.total = analysesData.length;
    stats.analyses.withFeedback = analysesData.filter(a => a.feedback_worked !== null).length;

    const worked = analysesData.filter(a => a.feedback_worked === true).length;
    stats.analyses.successRate = stats.analyses.withFeedback > 0
      ? Math.round((worked / stats.analyses.withFeedback) * 100)
      : 0;

    for (const a of analysesData) {
      if (a.platform) {
        stats.analyses.byPlatform[a.platform] = (stats.analyses.byPlatform[a.platform] || 0) + 1;
      }
    }
  }

  // Training 통계
  const { data: trainingData } = await supabase.from("training_data").select("*");
  if (trainingData) {
    stats.training.total = trainingData.length;

    for (const t of trainingData) {
      stats.training.bySource[t.source] = (stats.training.bySource[t.source] || 0) + 1;
      if (t.platform) {
        stats.training.byPlatform[t.platform] = (stats.training.byPlatform[t.platform] || 0) + 1;
      }
    }
  }

  // Patterns 통계
  const { data: patternsData } = await supabase
    .from("issue_patterns")
    .select("*")
    .order("total_count", { ascending: false })
    .limit(10);

  if (patternsData) {
    stats.patterns.total = patternsData.length;
    stats.patterns.topIssues = patternsData.map(p => ({
      type: p.issue_type,
      count: p.total_count,
      successRate: p.total_count > 0 ? Math.round((p.success_count / p.total_count) * 100) : 0,
    }));
  }

  return NextResponse.json(stats);
}

// 최근 데이터
async function getRecentData() {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ error: "Supabase not configured" });
  }

  const { data: recentAnalyses } = await supabase
    .from("analyses")
    .select("id, created_at, platform, detected_issues, feedback_worked")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: recentTraining } = await supabase
    .from("training_data")
    .select("id, created_at, source, platform, prompt")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    recentAnalyses: recentAnalyses || [],
    recentTraining: (recentTraining || []).map(t => ({
      ...t,
      prompt: t.prompt?.slice(0, 100) + "...",
    })),
  });
}

// 최근 에러 (로그에서)
async function getRecentErrors() {
  // Vercel에서는 로그가 별도로 저장되므로, 여기서는 기본 정보만 제공
  return NextResponse.json({
    message: "Check Vercel dashboard for detailed logs",
    dashboardUrl: "https://vercel.com/dashboard",
    tips: [
      "Go to your project -> Deployments -> Select deployment -> Runtime Logs",
      "Or use 'vercel logs' CLI command",
    ],
  });
}
