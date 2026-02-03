-- Add router_config column to agents table
ALTER TABLE public.agents
ADD COLUMN router_config jsonb DEFAULT '{"strategy": "all_destinations", "rules": []}'::jsonb;