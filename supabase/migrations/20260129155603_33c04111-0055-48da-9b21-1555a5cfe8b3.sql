-- Create table to store workspace research findings
CREATE TABLE public.workspace_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT,
  research_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  emails_analyzed INTEGER DEFAULT 0,
  documents_analyzed INTEGER DEFAULT 0,
  sheets_analyzed INTEGER DEFAULT 0,
  events_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups by user
CREATE INDEX idx_workspace_research_user_id ON public.workspace_research(user_id);

-- Enable RLS
ALTER TABLE public.workspace_research ENABLE ROW LEVEL SECURITY;

-- Users can view their own research
CREATE POLICY "Users can view their own research"
ON public.workspace_research
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own research
CREATE POLICY "Users can insert their own research"
ON public.workspace_research
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own research
CREATE POLICY "Users can update their own research"
ON public.workspace_research
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own research
CREATE POLICY "Users can delete their own research"
ON public.workspace_research
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_workspace_research_updated_at
BEFORE UPDATE ON public.workspace_research
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();