-- Migration to update existing agent destinations with targetTable and targetColumn
-- This ensures backward compatibility with the new universal routing system

DO $$
DECLARE
  agent_record RECORD;
  updated_modules JSONB;
  dest JSONB;
  updated_destinations JSONB[];
  i INT;
BEGIN
  -- Iterate through all agents that have modules
  FOR agent_record IN 
    SELECT id, modules 
    FROM public.agents 
    WHERE modules IS NOT NULL AND jsonb_typeof(modules) = 'array'
  LOOP
    updated_modules := agent_record.modules;
    
    -- Find the destinations module
    FOR i IN 0..jsonb_array_length(updated_modules) - 1 LOOP
      IF (updated_modules->i->>'type') = 'destinations' THEN
        updated_destinations := ARRAY[]::JSONB[];
        
        -- Process each destination
        FOR dest IN SELECT * FROM jsonb_array_elements(updated_modules->i->'config'->'destinations')
        LOOP
          -- Only update if targetTable and targetColumn are not set
          IF (dest->>'targetTable') IS NULL AND (dest->>'targetColumn') IS NULL THEN
            -- Set default targetTable
            dest := jsonb_set(dest, '{targetTable}', '"tasks"', true);
            
            -- Extract targetColumn from type field (e.g., 'task_pitch' -> 'pitch')
            IF (dest->>'type') LIKE 'task_%' THEN
              dest := jsonb_set(
                dest, 
                '{targetColumn}', 
                to_jsonb(REPLACE(dest->>'type', 'task_', '')), 
                true
              );
            ELSE
              -- If type doesn't follow task_* pattern, use the type as column
              dest := jsonb_set(dest, '{targetColumn}', dest->'type', true);
            END IF;
          END IF;
          
          updated_destinations := array_append(updated_destinations, dest);
        END LOOP;
        
        -- Update the destinations in the module
        updated_modules := jsonb_set(
          updated_modules,
          array[i::text, 'config', 'destinations'],
          to_jsonb(updated_destinations),
          true
        );
      END IF;
    END LOOP;
    
    -- Update the agent with the modified modules
    UPDATE public.agents
    SET modules = updated_modules
    WHERE id = agent_record.id;
    
    RAISE NOTICE 'Updated agent %', agent_record.id;
  END LOOP;
END $$;