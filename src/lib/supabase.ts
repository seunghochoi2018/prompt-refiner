import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Only create client if credentials are provided
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = !!supabase;

// Database types
export interface AnalysisRecord {
  id?: string;
  created_at?: string;
  image_hash: string;
  platform?: string;
  detected_issues: string[];
  original_prompt_guess: string;
  refined_prompt: string;
  feedback_score?: number;
  feedback_worked?: boolean;
  feedback_comment?: string;
  issues_remaining?: string[];
  result_image_url?: string;
  metadata?: Record<string, unknown>;
}

export interface IssuePattern {
  id?: string;
  issue_type: string;
  successful_fixes: string[];
  failed_fixes?: unknown[];
  success_count: number;
  total_count: number;
  platform?: string;
}
