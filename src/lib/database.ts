import { supabase, isSupabaseConfigured, AnalysisRecord } from "./supabase";

// Save analysis record
export async function saveAnalysis(record: Omit<AnalysisRecord, "id" | "created_at">) {
  if (!isSupabaseConfigured || !supabase) {
    console.log("Supabase not configured, skipping save");
    return null;
  }

  const { data, error } = await supabase
    .from("analyses")
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error("Error saving analysis:", error);
    return null;
  }

  return data;
}

// Update with feedback
export async function saveFeedback(
  analysisId: string,
  feedback: {
    score?: number;
    worked?: boolean;
    comment?: string;
    issuesRemaining?: string[];
    resultImageUrl?: string;
  }
) {
  if (!isSupabaseConfigured || !supabase) {
    console.log("Supabase not configured, skipping feedback save");
    return;
  }

  const { error } = await supabase
    .from("analyses")
    .update({
      feedback_score: feedback.score,
      feedback_worked: feedback.worked,
      feedback_comment: feedback.comment,
      issues_remaining: feedback.issuesRemaining,
      result_image_url: feedback.resultImageUrl,
    })
    .eq("id", analysisId);

  if (error) {
    console.error("Error saving feedback:", error);
    return;
  }

  if (feedback.worked !== undefined) {
    await updateIssuePatterns(analysisId, feedback.worked, feedback.issuesRemaining, feedback.comment);
  }
}

async function updateIssuePatterns(
  analysisId: string,
  worked: boolean,
  issuesRemaining?: string[],
  comment?: string
) {
  if (!isSupabaseConfigured || !supabase) return;

  const { data: analysis } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", analysisId)
    .single();

  if (!analysis) return;

  for (const issue of analysis.detected_issues) {
    const issueType = normalizeIssueType(issue);

    const { data: existing } = await supabase
      .from("issue_patterns")
      .select("*")
      .eq("issue_type", issueType)
      .eq("platform", analysis.platform || "unknown")
      .single();

    if (existing) {
      const updates: Record<string, unknown> = {
        total_count: existing.total_count + 1,
      };

      if (worked) {
        updates.success_count = existing.success_count + 1;
        const fixes = existing.successful_fixes || [];
        if (!fixes.includes(analysis.refined_prompt)) {
          updates.successful_fixes = [...fixes, analysis.refined_prompt].slice(-50);
        }
      } else {
        const failedFixes = existing.failed_fixes || [];
        const failureEntry = {
          prompt: analysis.refined_prompt,
          issues_remaining: issuesRemaining || [],
          comment: comment || "",
        };
        updates.failed_fixes = [...failedFixes, failureEntry].slice(-30);
      }

      await supabase
        .from("issue_patterns")
        .update(updates)
        .eq("id", existing.id);
    } else {
      const newPattern: Record<string, unknown> = {
        issue_type: issueType,
        platform: analysis.platform || "unknown",
        successful_fixes: worked ? [analysis.refined_prompt] : [],
        failed_fixes: worked ? [] : [{
          prompt: analysis.refined_prompt,
          issues_remaining: issuesRemaining || [],
          comment: comment || "",
        }],
        success_count: worked ? 1 : 0,
        total_count: 1,
      };

      await supabase.from("issue_patterns").insert(newPattern);
    }
  }

  if (!worked && issuesRemaining && issuesRemaining.length > 0) {
    for (const remaining of issuesRemaining) {
      await trackRemainingIssue(remaining, analysis.refined_prompt, analysis.platform);
    }
  }
}

async function trackRemainingIssue(issue: string, attemptedFix: string, platform?: string) {
  if (!isSupabaseConfigured || !supabase) return;

  const issueType = normalizeRemainingIssue(issue);

  const { data: existing } = await supabase
    .from("persistent_issues")
    .select("*")
    .eq("issue_type", issueType)
    .eq("platform", platform || "unknown")
    .single();

  if (existing) {
    await supabase
      .from("persistent_issues")
      .update({
        occurrence_count: existing.occurrence_count + 1,
        failed_attempts: [...(existing.failed_attempts || []), attemptedFix].slice(-20),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("persistent_issues").insert({
      issue_type: issueType,
      platform: platform || "unknown",
      occurrence_count: 1,
      failed_attempts: [attemptedFix],
    });
  }
}

function normalizeRemainingIssue(issue: string): string {
  const lower = issue.toLowerCase();
  if (lower.includes("hand")) return "persistent_hand_issues";
  if (lower.includes("face")) return "persistent_face_issues";
  if (lower.includes("text")) return "persistent_text_issues";
  if (lower.includes("lighting")) return "persistent_lighting_issues";
  if (lower.includes("different") || lower.includes("intent")) return "prompt_drift";
  if (lower.includes("new issues")) return "introduced_new_issues";
  return "other_persistent";
}

function normalizeIssueType(issue: string): string {
  const lower = issue.toLowerCase();
  if (lower.includes("finger") || lower.includes("hand")) return "hand_issues";
  if (lower.includes("face") || lower.includes("eye") || lower.includes("mouth")) return "face_distortion";
  if (lower.includes("text") || lower.includes("letter") || lower.includes("word")) return "text_artifact";
  if (lower.includes("lighting") || lower.includes("shadow")) return "lighting_inconsistency";
  if (lower.includes("perspective") || lower.includes("proportion")) return "perspective_issues";
  if (lower.includes("blur") || lower.includes("artifact")) return "image_artifacts";
  return "other";
}

// Get best fixes for an issue type
export async function getBestFixes(issueType: string, platform?: string) {
  if (!isSupabaseConfigured || !supabase) return [];

  let query = supabase
    .from("issue_patterns")
    .select("*")
    .eq("issue_type", issueType)
    .order("success_count", { ascending: false });

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data } = await query.limit(5);
  return data || [];
}

// Get patterns to avoid (failed fixes)
export async function getFailedPatterns(issueType: string, platform?: string) {
  if (!isSupabaseConfigured || !supabase) return [];

  let query = supabase
    .from("issue_patterns")
    .select("failed_fixes")
    .eq("issue_type", issueType);

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data } = await query.limit(1);
  return data?.[0]?.failed_fixes || [];
}

// Get success rate for issue types
export async function getIssueSuccessRates() {
  if (!isSupabaseConfigured || !supabase) return {};

  const { data } = await supabase
    .from("issue_patterns")
    .select("issue_type, success_count, total_count, platform");

  if (!data) return {};

  const rates: Record<string, { rate: number; count: number }> = {};

  for (const pattern of data) {
    if (pattern.total_count > 0) {
      const key = `${pattern.issue_type}_${pattern.platform}`;
      rates[key] = {
        rate: pattern.success_count / pattern.total_count,
        count: pattern.total_count,
      };
    }
  }

  return rates;
}

// Generate hash for image deduplication
export async function generateImageHash(base64: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(base64.slice(0, 10000));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
