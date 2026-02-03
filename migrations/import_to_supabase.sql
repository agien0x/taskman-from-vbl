-- =============================================================================
-- Migration Script: Import Tasks into VibeCode Supabase Platform
-- =============================================================================
-- This script imports exported cloud task data into the VibeCode Supabase database
-- Execute this after running the export script and having the data ready

-- Begin transaction for atomic migration
BEGIN;

-- Create temporary table for migration data staging
CREATE TEMPORARY TABLE migration_staging_tasks (
    task_id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    column_id TEXT NOT NULL DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id UUID,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    planned_hours NUMERIC,
    task_type task_type DEFAULT 'task',
    position INTEGER DEFAULT 0,
    is_root BOOLEAN DEFAULT false,
    custom_columns JSONB,
    attachments JSONB,
    duplicates JSONB,
    pitch TEXT,
    content_embedding VECTOR(1536),
    custom_quality_criteria TEXT,
    custom_template TEXT,
    use_custom_settings BOOLEAN,
    default_content TEXT,
    last_recurrence_update TIMESTAMP WITH TIME ZONE,
    last_score_at TIMESTAMP WITH TIME ZONE,
    recurrence_type TEXT,
    recurrence_days JSONB,
    recurrence_time TEXT,
    subtask_order INTEGER,
    auto_load_my_tasks BOOLEAN
);

-- Stage 1: Import core task data
-- =============================================================================

-- Insert tasks into staging table (replace with your actual data source)
INSERT INTO migration_staging_tasks (
    task_id, title, content, column_id, priority, 
    created_at, updated_at, owner_id, start_date, end_date, 
    planned_hours, position
)
SELECT 
    gen_random_uuid(), -- Generate new UUID for VibeCode
    title,
    content,
    column_id,
    priority::task_priority,
    COALESCE(created_at, NOW()) as created_at,
    COALESCE(updated_at, NOW()) as updated_at,
    owner_id::uuid,
    start_date::timestamp with time zone,
    end_date::timestamp with time zone,
    planned_hours::numeric,
    ROW_NUMBER() OVER (ORDER BY created_at) - 1 as position
FROM your_exported_tasks_table;

-- Stage 2: Insert tasks into main tasks table
-- =============================================================================

INSERT INTO public.tasks (
    id, title, content, column_id, priority, 
    created_at, updated_at, owner_id, start_date, end_date,
    planned_hours, task_type, position, is_root,
    custom_columns, attachments, duplicates, pitch,
    custom_quality_criteria, custom_template, use_custom_settings,
    default_content, last_recurrence_update, last_score_at,
    recurrence_type, recurrence_days, recurrence_time,
    subtask_order, auto_load_my_tasks
)
SELECT 
    task_id, title, content, column_id, priority,
    created_at, updated_at, owner_id, start_date, end_date,
    planned_hours, task_type, position, is_root,
    custom_columns, attachments, duplicates, pitch,
    custom_quality_criteria, custom_template, use_custom_settings,
    default_content, last_recurrence_update, last_score_at,
    recurrence_type, recurrence_days, recurrence_time,
    subtask_order, auto_load_my_tasks
FROM migration_staging_tasks;

-- Stage 3: Import task relationships/dependencies
-- =============================================================================

-- Create temporary staging for relations
CREATE TEMPORARY TABLE migration_staging_relations (
    parent_id UUID,
    child_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert relations data (replace with your actual data)
INSERT INTO migration_staging_relations (parent_id, child_id, created_at)
SELECT 
    parent.task_id,
    child.task_id,
    COALESCE(rel.created_at, NOW())
FROM your_exported_relations_table rel
JOIN migration_staging_tasks parent ON rel.parent_task_id::text = parent.task_id::text
JOIN migration_staging_tasks child ON rel.child_task_id::text = child.task_id::text;

-- Insert into task_relations table
INSERT INTO public.task_relations (parent_id, child_id, created_at)
SELECT parent_id, child_id, created_at
FROM migration_staging_relations;

-- Stage 4: Import task assignments
-- =============================================================================

-- Create temporary staging for assignments
CREATE TEMPORARY TABLE migration_staging_assignments (
    task_id UUID,
    user_id UUID,
    role task_member_role DEFAULT 'contributor',
    board_role board_role DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert assignments data (replace with your actual data)
INSERT INTO migration_staging_assignments (task_id, user_id, role, created_at)
SELECT 
    task.task_id,
    user_id::uuid,
    role::task_member_role,
    COALESCE(created_at, NOW())
FROM your_exported_assignments_table assign
JOIN migration_staging_tasks task ON assign.task_id::text = task.task_id::text;

-- Insert into task_assignments table
INSERT INTO public.task_assignments (task_id, user_id, role, board_role, created_at)
SELECT task_id, user_id, role, board_role, created_at
FROM migration_staging_assignments;

-- Stage 5: Import comments
-- =============================================================================

-- Insert comments data (replace with your actual data)
INSERT INTO public.comments (id, content, task_id, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    content,
    task.task_id,
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW())
FROM your_exported_comments_table comment
JOIN migration_staging_tasks task ON comment.task_id::text = task.task_id::text;

-- Stage 6: Import time logs
-- =============================================================================

-- Insert time logs data (replace with your actual data)
INSERT INTO public.time_logs (
    id, task_id, user_id, description, hours, 
    completion_percentage, created_at
)
SELECT 
    gen_random_uuid(),
    task.task_id,
    user_id::uuid,
    description,
    hours::numeric,
    completion_percentage::numeric,
    logged_at as created_at
FROM your_exported_time_logs_table time_log
JOIN migration_staging_tasks task ON time_log.task_id::text = task.task_id::text;

-- Stage 7: Create task versions for history
-- =============================================================================

INSERT INTO public.task_versions (id, task_id, content, created_at)
SELECT 
    gen_random_uuid(),
    task_id,
    content,
    created_at
FROM migration_staging_tasks;

-- Migration verification queries
-- =============================================================================

-- Count imported tasks
DO $$
DECLARE
    imported_tasks_count INTEGER;
    imported_relations_count INTEGER;
    imported_assignments_count INTEGER;
    imported_comments_count INTEGER;
    imported_time_logs_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO imported_tasks_count FROM public.tasks;
    SELECT COUNT(*) INTO imported_relations_count FROM public.task_relations;
    SELECT COUNT(*) INTO imported_assignments_count FROM public.task_assignments;
    SELECT COUNT(*) INTO imported_comments_count FROM public.comments;
    SELECT COUNT(*) INTO imported_time_logs_count FROM public.time_logs;
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '- Tasks imported: %', imported_tasks_count;
    RAISE NOTICE '- Relations imported: %', imported_relations_count;
    RAISE NOTICE '- Assignments imported: %', imported_assignments_count;
    RAISE NOTICE '- Comments imported: %', imported_comments_count;
    RAISE NOTICE '- Time logs imported: %', imported_time_logs_count;
END $$;

-- Clean up temporary tables
DROP TABLE migration_staging_tasks;
DROP TABLE migration_staging_relations;
DROP TABLE migration_staging_assignments;

-- Commit transaction
COMMIT;

-- Rebuild indexes for performance
REINDEX TABLE public.tasks;
REINDEX TABLE public.task_relations;
REINDEX TABLE public.task_assignments;
REINDEX TABLE public.comments;
REINDEX TABLE public.time_logs;

ANALYZE public.tasks;
ANALYZE public.task_relations;
ANALYZE public.task_assignments;
ANALYZE public.comments;
ANALYZE public.time_logs;