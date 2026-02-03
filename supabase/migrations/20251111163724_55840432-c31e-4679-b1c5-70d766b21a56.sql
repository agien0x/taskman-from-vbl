-- Add trigger_config column to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS trigger_config JSONB DEFAULT '{"enabled": false, "strategy": "all_match", "rules": []}'::jsonb;