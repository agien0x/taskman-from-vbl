-- Migration: Create agent_executions table
-- Description: Table for logging agent execution history

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_executions') THEN
    CREATE TABLE public.agent_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
      execution_type TEXT NOT NULL,
      input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      output_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      context JSONB NOT NULL DEFAULT '{}'::jsonb,
      modules_chain JSONB DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'success',
      error_message TEXT,
      duration_ms INTEGER,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      rating_comment TEXT,
      rated_by UUID,
      rated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX idx_agent_executions_agent_id ON public.agent_executions(agent_id);
    CREATE INDEX idx_agent_executions_created_at ON public.agent_executions(created_at DESC);
    CREATE INDEX idx_agent_executions_status ON public.agent_executions(status);

    -- Enable RLS
    ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    CREATE POLICY "Users can view agent executions"
      ON public.agent_executions FOR SELECT
      USING (true);

    CREATE POLICY "System can insert agent executions"
      ON public.agent_executions FOR INSERT
      WITH CHECK (true);

    CREATE POLICY "Users can rate executions"
      ON public.agent_executions FOR UPDATE
      USING (true);

    RAISE NOTICE 'Table public.agent_executions created successfully';
  ELSE
    RAISE NOTICE 'Table public.agent_executions already exists, skipping';
  END IF;
END $$;
