-- Add recommended_parents field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN recommended_parents jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.recommended_parents IS 'Array of recommended parent task IDs for this user';