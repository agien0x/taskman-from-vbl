-- Add parent_comment_id to comments table for nested comments
ALTER TABLE public.comments
ADD COLUMN parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX idx_comments_parent_id ON public.comments(parent_comment_id);
CREATE INDEX idx_comments_task_id ON public.comments(task_id);