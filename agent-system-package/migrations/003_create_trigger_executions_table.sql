-- Migration: Create trigger_executions table
-- Description: Table for logging trigger execution attempts

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trigger_executions') THEN
    CREATE TABLE public.trigger_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
      trigger_type TEXT NOT NULL,
      source_entity_type TEXT NOT NULL,
      source_entity_id UUID NOT NULL,
      changed_fields JSONB,
      conditions_met BOOLEAN NOT NULL,
      executed BOOLEAN NOT NULL DEFAULT false,
      execution_id UUID REFERENCES public.agent_executions(id) ON DELETE SET NULL,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX idx_trigger_executions_agent_id ON public.trigger_executions(agent_id);
    CREATE INDEX idx_trigger_executions_created_at ON public.trigger_executions(created_at DESC);
    CREATE INDEX idx_trigger_executions_source ON public.trigger_executions(source_entity_type, source_entity_id);

    -- Enable RLS
    ALTER TABLE public.trigger_executions ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    CREATE POLICY "Users can view trigger executions"
      ON public.trigger_executions FOR SELECT
      USING (true);

    CREATE POLICY "System can insert trigger executions"
      ON public.trigger_executions FOR INSERT
      WITH CHECK (true);

    RAISE NOTICE 'Table public.trigger_executions created successfully';
  ELSE
    RAISE NOTICE 'Table public.trigger_executions already exists, skipping';
  END IF;
END $$;
