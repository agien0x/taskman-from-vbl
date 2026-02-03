-- Step 2: Update existing NULL priorities and set default
UPDATE public.tasks SET priority = 'none' WHERE priority IS NULL;

ALTER TABLE public.tasks ALTER COLUMN priority SET DEFAULT 'none';