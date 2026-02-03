-- =============================================================================
-- Migration Script: Export Tasks from External Cloud System
-- =============================================================================
-- This script exports data from an external cloud-based task management system
-- for migration to the VibeCode Supabase platform.

-- Export Tasks (Main Data)
-- =============================================================================
SELECT 
    -- Core Task Fields (Mapping to Supabase schema)
    id::text as task_id,
    title::text,
    description::text as content,
    COALESCE(status::text, 'todo') as column_id,
    COALESCE(priority::text, 'medium')::task_priority as priority,
    created_at,
    updated_at,
    
    -- Optional Fields (if they exist in source)
    assignee_id::text as owner_id,
    start_date,
    due_date as end_date,
    estimated_hours as planned_hours,
    
    -- VibeCode Specific Fields (Defaults for new features)
    'task'::task_type as task_type,
    0 as position,
    false as is_root,
    NULL::jsonb as custom_columns,
    NULL::jsonb as attachments,
    NULL::jsonb as duplicates,
    NULL::text as pitch,
    NULL::text as content_embedding,
    NULL::jsonb as custom_quality_criteria,
    NULL::text as custom_template,
    NULL::boolean as use_custom_settings,
    NULL::text as default_content,
    NULL::timestamp with time zone as last_recurrence_update,
    NULL::timestamp with time zone as last_score_at,
    NULL::text as recurrence_type,
    NULL::jsonb as recurrence_days,
    NULL::text as recurrence_time,
    NULL::integer as subtask_order,
    NULL::boolean as auto_load_my_tasks

FROM external_tasks 
WHERE deleted_at IS NULL
ORDER BY created_at ASC;

-- Export Task Dependencies/Relations (if they exist)
-- =============================================================================
SELECT 
    parent_task_id::text,
    child_task_id::text,
    created_at
FROM external_task_dependencies
WHERE deleted_at IS NULL;

-- Export Task Assignments (if they exist)
-- =============================================================================
SELECT 
    task_id::text,
    user_id::text,
    CASE 
        WHEN role::text = 'owner' THEN 'owner'::task_member_role
        ELSE 'contributor'::task_member_role
    END as role,
    NULL::board_role as board_role,
    created_at
FROM external_task_assignments
WHERE deleted_at IS NULL;

-- Export Task Comments (if they exist)
-- =============================================================================
SELECT 
    task_id::text,
    content,
    created_at,
    updated_at,
    user_id as author_id
FROM external_task_comments
WHERE deleted_at IS NULL;

-- Export Task Time Logs (if they exist)
-- =============================================================================
SELECT 
    task_id::text,
    user_id,
    description,
    hours::numeric,
    completion_percentage::numeric,
    created_at::timestamp with time zone as logged_at
FROM external_time_logs
WHERE deleted_at IS NULL;

-- Export Task Attachments (if they exist)
-- =============================================================================
SELECT 
    task_id::text,
    file_name::text as name,
    file_path::text as url,
    file_size as size,
    mime_type as content_type,
    created_at
FROM external_attachments
WHERE deleted_at IS NULL;

-- Migration Statistics (for verification)
-- =============================================================================
SELECT 
    'Tasks' as entity_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_count
FROM external_tasks

UNION ALL

SELECT 
    'Dependencies' as entity_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_count
FROM external_task_dependencies

UNION ALL

SELECT 
    'Assignments' as entity_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_count
FROM external_task_assignments

UNION ALL

SELECT 
    'Comments' as entity_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_count
FROM external_task_comments

UNION ALL

SELECT 
    'Time Logs' as entity_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_count
FROM external_time_logs

UNION ALL

SELECT 
    'Attachments' as entity_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_count
FROM external_attachments;