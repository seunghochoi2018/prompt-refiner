-- Supabase SQL Schema for Prompt Refiner
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Analyses table: stores each image analysis
CREATE TABLE analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  image_hash VARCHAR(64) NOT NULL,
  platform VARCHAR(50), -- midjourney, dalle, stable_diffusion, sora, runway, etc.
  detected_issues TEXT[] NOT NULL DEFAULT '{}',
  original_prompt_guess TEXT NOT NULL,
  refined_prompt TEXT NOT NULL,
  feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
  feedback_worked BOOLEAN,
  feedback_comment TEXT, -- User's detailed feedback
  issues_remaining TEXT[] DEFAULT '{}', -- Which issues still remain after trying refined prompt
  result_image_url TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Issue patterns table: aggregated learnings (both successes AND failures)
CREATE TABLE issue_patterns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  issue_type VARCHAR(100) NOT NULL,
  platform VARCHAR(50) DEFAULT 'unknown',
  successful_fixes TEXT[] DEFAULT '{}', -- Prompts that worked
  failed_fixes JSONB DEFAULT '[]', -- Prompts that didn't work, with details
  success_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  UNIQUE(issue_type, platform)
);

-- Persistent issues table: track issues that keep coming back
CREATE TABLE persistent_issues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  issue_type VARCHAR(100) NOT NULL,
  platform VARCHAR(50) DEFAULT 'unknown',
  occurrence_count INTEGER DEFAULT 1,
  failed_attempts TEXT[] DEFAULT '{}', -- Prompts that failed to fix this
  UNIQUE(issue_type, platform)
);

-- Indexes for performance
CREATE INDEX idx_analyses_image_hash ON analyses(image_hash);
CREATE INDEX idx_analyses_platform ON analyses(platform);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_feedback ON analyses(feedback_worked) WHERE feedback_worked IS NOT NULL;
CREATE INDEX idx_analyses_negative_feedback ON analyses(feedback_worked) WHERE feedback_worked = false;

CREATE INDEX idx_issue_patterns_type ON issue_patterns(issue_type);
CREATE INDEX idx_issue_patterns_platform ON issue_patterns(platform);
CREATE INDEX idx_issue_patterns_success_rate ON issue_patterns(success_count DESC);

CREATE INDEX idx_persistent_issues_type ON persistent_issues(issue_type);
CREATE INDEX idx_persistent_issues_count ON persistent_issues(occurrence_count DESC);

-- Updated at trigger for issue_patterns
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_patterns_updated_at
  BEFORE UPDATE ON issue_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER persistent_issues_updated_at
  BEFORE UPDATE ON persistent_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE persistent_issues ENABLE ROW LEVEL SECURITY;

-- Policies: Allow anonymous read/insert for MVP
CREATE POLICY "Allow anonymous insert" ON analyses
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous read" ON analyses
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous update feedback" ON analyses
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow read issue patterns" ON issue_patterns
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow insert issue patterns" ON issue_patterns
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update issue patterns" ON issue_patterns
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow read persistent issues" ON persistent_issues
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow insert persistent issues" ON persistent_issues
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update persistent issues" ON persistent_issues
  FOR UPDATE TO anon USING (true);

-- Analytics views
CREATE VIEW issue_success_rates AS
SELECT
  issue_type,
  platform,
  success_count,
  total_count,
  CASE
    WHEN total_count > 0 THEN ROUND((success_count::DECIMAL / total_count) * 100, 2)
    ELSE 0
  END as success_rate_percent,
  CASE
    WHEN total_count > 0 THEN ROUND(((total_count - success_count)::DECIMAL / total_count) * 100, 2)
    ELSE 0
  END as failure_rate_percent
FROM issue_patterns
ORDER BY total_count DESC;

-- View for most problematic issues (hard to fix)
CREATE VIEW hardest_issues AS
SELECT
  p.issue_type,
  p.platform,
  p.occurrence_count,
  ip.success_count,
  ip.total_count,
  CASE
    WHEN ip.total_count > 0 THEN ROUND((ip.success_count::DECIMAL / ip.total_count) * 100, 2)
    ELSE 0
  END as success_rate_percent
FROM persistent_issues p
LEFT JOIN issue_patterns ip ON
  p.issue_type = CONCAT('persistent_', ip.issue_type) OR
  p.issue_type LIKE CONCAT('%', ip.issue_type, '%')
ORDER BY p.occurrence_count DESC;

-- View for negative feedback analysis
CREATE VIEW negative_feedback_analysis AS
SELECT
  platform,
  unnest(issues_remaining) as remaining_issue,
  COUNT(*) as count,
  array_agg(DISTINCT feedback_comment) FILTER (WHERE feedback_comment IS NOT NULL) as user_comments
FROM analyses
WHERE feedback_worked = false
GROUP BY platform, unnest(issues_remaining)
ORDER BY count DESC;
