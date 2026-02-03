-- Add modules_chain to agent_executions to track module execution flow
ALTER TABLE agent_executions 
ADD COLUMN IF NOT EXISTS modules_chain jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN agent_executions.modules_chain IS 'Array of executed modules in order with their outputs and timestamps';