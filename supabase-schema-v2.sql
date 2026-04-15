-- Run this in Supabase SQL Editor to add new features

-- Add cover image, sharing, and inline images to pages
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS share_id text UNIQUE;

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL DEFAULT '',
  user_email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Comment policies: owner can manage, anyone can read on public pages
CREATE POLICY "Users manage own comments" ON public.comments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read comments on public pages" ON public.comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pages WHERE pages.id = comments.page_id AND pages.is_public = true)
  );

-- Public pages can be read by anyone
CREATE POLICY "Anyone can read public pages" ON public.pages
  FOR SELECT USING (is_public = true);

-- Page images table (inline images)
CREATE TABLE IF NOT EXISTS public.page_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.page_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own images" ON public.page_images
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bucket for images (run this separately if needed)
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can read images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');
