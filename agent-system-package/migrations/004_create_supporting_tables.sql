-- Migration: Create supporting tables
-- Description: Agent versions, ratings, and input versions

DO $$ 
BEGIN
  -- Agent Versions Table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_versions') THEN
    CREATE TABLE public.agent_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt TEXT NOT NULL,
      inputs JSONB,
      outputs JSONB,
      router_config JSONB,
      trigger_config JSONB,
      inputs_raw TEXT,
      router_raw TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_agent_versions_agent_id ON public.agent_versions(agent_id);
    
    ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view agent versions"
      ON public.agent_versions FOR SELECT USING (true);
    
    CREATE POLICY "Users can create agent versions"
      ON public.agent_versions FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "Users can delete agent versions"
      ON public.agent_versions FOR DELETE USING (true);

    RAISE NOTICE 'Table public.agent_versions created';
  END IF;

  -- Agent Ratings Table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_ratings') THEN
    CREATE TABLE public.agent_ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      rated_by UUID,
      rated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_agent_ratings_agent_id ON public.agent_ratings(agent_id);
    
    ALTER TABLE public.agent_ratings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view agent ratings"
      ON public.agent_ratings FOR SELECT USING (true);
    
    CREATE POLICY "Users can create agent ratings"
      ON public.agent_ratings FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "Users can update their own ratings"
      ON public.agent_ratings FOR UPDATE USING (rated_by = auth.uid());
    
    CREATE POLICY "Users can delete their own ratings"
      ON public.agent_ratings FOR DELETE USING (rated_by = auth.uid());

    RAISE NOTICE 'Table public.agent_ratings created';
  END IF;

  -- Agent Input Versions Table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_input_versions') THEN
    CREATE TABLE public.agent_input_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_agent_input_versions_agent_id ON public.agent_input_versions(agent_id);
    
    ALTER TABLE public.agent_input_versions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view agent input versions"
      ON public.agent_input_versions FOR SELECT USING (true);
    
    CREATE POLICY "Users can create agent input versions"
      ON public.agent_input_versions FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "Users can delete agent input versions"
      ON public.agent_input_versions FOR DELETE USING (true);

    RAISE NOTICE 'Table public.agent_input_versions created';
  END IF;

  -- Module Versions Table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'module_versions') THEN
    CREATE TABLE public.module_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL,
      module_id TEXT NOT NULL,
      module_type TEXT NOT NULL,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_template BOOLEAN NOT NULL DEFAULT false,
      template_name TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_module_versions_agent_id ON public.module_versions(agent_id);
    CREATE INDEX idx_module_versions_module_id ON public.module_versions(module_id);
    
    ALTER TABLE public.module_versions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view module versions"
      ON public.module_versions FOR SELECT USING (true);
    
    CREATE POLICY "Users can create module versions"
      ON public.module_versions FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "Users can update their own module versions"
      ON public.module_versions FOR UPDATE USING (created_by = auth.uid());
    
    CREATE POLICY "Users can delete their own module versions"
      ON public.module_versions FOR DELETE USING (created_by = auth.uid());

    RAISE NOTICE 'Table public.module_versions created';
  END IF;
END $$;
