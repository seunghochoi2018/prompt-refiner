import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface AnalysisRecord {
  id?: string;
  created_at?: string;
  image_hash: string; // SHA256 hash of image for deduplication
  platform?: string; // midjourney, dalle, sd, sora, runway, etc.
  detected_issues: string[];
  original_prompt_guess: string;
  refined_prompt: string;
  feedback_score?: number; // 1-5 rating
  feedback_worked?: boolean; // Did the refined prompt work?
  result_image_url?: string; // Optional: user uploads improved result
  metadata?: Record<string, unknown>;
}

export interface IssuePattern {
  id?: string;
  issue_type: string; // "extra_fingers", "face_distortion", "text_artifact", etc.
  successful_fixes: string[]; // Prompt patterns that worked
  success_count: number;
  total_count: number;
  platform?: string;
}
