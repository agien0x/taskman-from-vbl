-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for task attachments
CREATE POLICY "Anyone can view task attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their task attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their task attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

-- Add attachments column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;