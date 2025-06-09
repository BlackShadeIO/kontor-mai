-- Enhanced Cases Table Migration
-- This migration adds advanced features to the cases table

-- Add new columns to cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS actual_duration INTEGER,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update cases table to ensure case_id is auto-generated if not provided
CREATE OR REPLACE FUNCTION generate_case_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_id IS NULL OR NEW.case_id = '' THEN
    -- Generate a case ID in format: CASE-YYYY-XXXX (where XXXX is a sequential number)
    NEW.case_id := 'CASE-' || EXTRACT(YEAR FROM NOW()) || '-' || 
                   LPAD((SELECT COALESCE(MAX(CAST(SPLIT_PART(case_id, '-', 3) AS INTEGER)), 0) + 1 
                         FROM cases 
                         WHERE case_id LIKE 'CASE-' || EXTRACT(YEAR FROM NOW()) || '-%'), 4, '0');
  END IF;
  
  -- Always update the updated_at timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating case_id and updating timestamps
DROP TRIGGER IF EXISTS cases_auto_fields ON cases;
CREATE TRIGGER cases_auto_fields
  BEFORE INSERT OR UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION generate_case_id();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_due_date ON cases(due_date);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_cases_project_id ON cases(project_id);
CREATE INDEX IF NOT EXISTS idx_cases_customer_id ON cases(customer_id);

-- Create a view for case analytics
CREATE OR REPLACE VIEW case_analytics AS
SELECT 
  user_id,
  COUNT(*) as total_cases,
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_cases,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_cases,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_cases,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_cases,
  COUNT(*) FILTER (WHERE priority = 'low') as low_priority_cases,
  COUNT(*) FILTER (WHERE priority = 'normal') as normal_priority_cases,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_cases,
  COUNT(*) FILTER (WHERE priority = 'emergency') as emergency_priority_cases,
  COALESCE(SUM(estimated_cost), 0) as total_estimated_revenue,
  COALESCE(SUM(actual_cost), 0) as total_actual_revenue,
  AVG(estimated_duration) as avg_estimated_duration,
  AVG(actual_duration) as avg_actual_duration
FROM cases
GROUP BY user_id;

-- Add RLS (Row Level Security) policies if not already present
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own cases" ON cases;
DROP POLICY IF EXISTS "Users can insert their own cases" ON cases;
DROP POLICY IF EXISTS "Users can update their own cases" ON cases;
DROP POLICY IF EXISTS "Users can delete their own cases" ON cases;

-- Create RLS policies
CREATE POLICY "Users can view their own cases" ON cases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cases" ON cases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cases" ON cases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cases" ON cases
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT ON case_analytics TO authenticated;
GRANT ALL ON cases TO authenticated;

-- Add helpful comments
COMMENT ON TABLE cases IS 'Enhanced cases table for project and customer case management';
COMMENT ON COLUMN cases.case_id IS 'Auto-generated unique case identifier in format CASE-YYYY-XXXX';
COMMENT ON COLUMN cases.actual_duration IS 'Actual time spent on case in minutes';
COMMENT ON COLUMN cases.tags IS 'Array of tags for categorizing cases';
COMMENT ON COLUMN cases.notes IS 'Internal notes for case management';
COMMENT ON VIEW case_analytics IS 'Aggregated analytics for cases by user'; 