-- Migration: Create agents table
-- Description: Core table for storing agent configurations

DO $$ 
BEGIN
  -- Create agents table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
    CREATE TABLE public.agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'grok-4-0709',
      prompt TEXT NOT NULL,
      modules JSONB DEFAULT '[]'::jsonb,
      pitch TEXT,
      trigger_config JSONB DEFAULT '{"type": "on_update", "rules": [], "enabled": false, "strategy": "all_match", "intervalMinutes": 60}'::jsonb,
      router_config JSONB DEFAULT '{"rules": [], "strategy": "all_destinations"}'::jsonb,
      inputs JSONB DEFAULT '[]'::jsonb,
      outputs JSONB DEFAULT '[]'::jsonb,
      inputs_raw TEXT,
      router_raw TEXT,
      icon_url TEXT,
      last_trigger_execution TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Create index on name for faster searches
    CREATE INDEX idx_agents_name ON public.agents(name);
    CREATE INDEX idx_agents_created_at ON public.agents(created_at DESC);

    -- Enable Row Level Security
    ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view all agents"
      ON public.agents FOR SELECT
      USING (true);

    CREATE POLICY "Users can create agents"
      ON public.agents FOR INSERT
      WITH CHECK (true);

    CREATE POLICY "Users can update agents"
      ON public.agents FOR UPDATE
      USING (true);

    -- Create trigger for updated_at
    CREATE TRIGGER update_agents_updated_at
      BEFORE UPDATE ON public.agents
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'Table public.agents created successfully';
  ELSE
    RAISE NOTICE 'Table public.agents already exists, skipping';
  END IF;
END $$;
