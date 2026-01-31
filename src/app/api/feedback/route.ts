import { NextRequest, NextResponse } from "next/server";
import { saveFeedback } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { analysisId, score, worked, comment, issuesRemaining, resultImageUrl } = await request.json();

    if (!analysisId) {
      return NextResponse.json(
        { error: "Analysis ID is required" },
        { status: 400 }
      );
    }

    await saveFeedback(analysisId, {
      score,
      worked,
      comment,
      issuesRemaining,
      resultImageUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
