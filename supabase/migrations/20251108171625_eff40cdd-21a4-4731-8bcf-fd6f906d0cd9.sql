-- Create widget_tokens table for API access control
CREATE TABLE IF NOT EXISTS public.widget_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB DEFAULT '{"read": true, "write": true, "delete": false}'::jsonb,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.widget_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own widget tokens"
  ON public.widget_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own tokens
CREATE POLICY "Users can create own widget tokens"
  ON public.widget_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update own widget tokens"
  ON public.widget_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete own widget tokens"
  ON public.widget_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_widget_tokens_token ON public.widget_tokens(token);
CREATE INDEX IF NOT EXISTS idx_widget_tokens_user_id ON public.widget_tokens(user_id);