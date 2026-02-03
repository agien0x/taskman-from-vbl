-- Update trigger_config default to include new type field
ALTER TABLE agents 
ALTER COLUMN trigger_config SET DEFAULT '{"enabled": false, "type": "on_update", "intervalMinutes": 60, "strategy": "all_match", "rules": []}'::jsonb;