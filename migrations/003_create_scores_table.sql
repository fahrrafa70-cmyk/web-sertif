-- Migration: Create scores table for storing score data separately from certificates
-- This migration creates a new scores table to store score information independently

-- Create scores table
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  issue_date DATE NOT NULL,
  expired_date DATE,
  category TEXT,
  template_id UUID REFERENCES templates(id),
  member_id UUID REFERENCES members(id),
  score_image_url TEXT,
  text_layers JSONB DEFAULT '[]'::jsonb,
  score_data JSONB DEFAULT '{}'::jsonb, -- Store score-specific data like nilai, kompetensi, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  public_id TEXT UNIQUE,
  is_public BOOLEAN DEFAULT TRUE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scores_member_id ON scores(member_id);
CREATE INDEX IF NOT EXISTS idx_scores_template_id ON scores(template_id);
CREATE INDEX IF NOT EXISTS idx_scores_public_id ON scores(public_id) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at);
CREATE INDEX IF NOT EXISTS idx_scores_score_no ON scores(score_no);

-- Add RLS (Row Level Security) policies
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all scores
CREATE POLICY "Authenticated users can read all scores"
ON scores
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert scores
CREATE POLICY "Authenticated users can insert scores"
ON scores
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update scores
CREATE POLICY "Authenticated users can update scores"
ON scores
FOR UPDATE
TO authenticated
USING (true);

-- Policy: Authenticated users can delete scores
CREATE POLICY "Authenticated users can delete scores"
ON scores
FOR DELETE
TO authenticated
USING (true);

-- Policy: Public users can read public scores
CREATE POLICY "Public users can read public scores"
ON scores
FOR SELECT
TO anon, authenticated
USING (is_public = TRUE);

-- Add comments for documentation
COMMENT ON TABLE scores IS 'Table for storing score data separately from certificates';
COMMENT ON COLUMN scores.score_no IS 'Unique score number identifier';
COMMENT ON COLUMN scores.score_data IS 'JSONB field storing score-specific data like nilai, kompetensi, etc.';
COMMENT ON COLUMN scores.text_layers IS 'JSONB array of text layer configurations for score rendering';
COMMENT ON COLUMN scores.score_image_url IS 'URL to the generated score image';
COMMENT ON COLUMN scores.public_id IS 'Public identifier for sharing scores without authentication';
COMMENT ON COLUMN scores.is_public IS 'Whether this score is publicly accessible';
