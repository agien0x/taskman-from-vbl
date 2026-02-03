-- Step 1: Add 'none' to task_priority enum
ALTER TYPE task_priority ADD VALUE IF NOT EXISTS 'none';