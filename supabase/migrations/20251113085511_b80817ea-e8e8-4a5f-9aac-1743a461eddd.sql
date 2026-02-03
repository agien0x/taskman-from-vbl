-- Create storage bucket for task images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-images',
  'task-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload task images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-images');

-- Allow everyone to view images (public bucket)
CREATE POLICY "Anyone can view task images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'task-images');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their task images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'task-images' AND auth.uid()::text = (storage.foldername(name))[1]);