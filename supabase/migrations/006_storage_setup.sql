-- Migration 006: Supabase Cloud Storage Buckets and Policies
-- Idempotent configuration for REclaim item images and claim proof documents

-- 1. Create public 'item-images' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'item-images', 
    'item-images', 
    true, 
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Create private 'claim-proofs' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'claim-proofs', 
    'claim-proofs', 
    false, 
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

-- 3. Storage Policies on storage.objects

-- Item Images: Public select
DROP POLICY IF EXISTS "Public item images are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Public item images select" ON storage.objects;
CREATE POLICY "Public item images are viewable by everyone" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'item-images');

-- Item Images: Authenticated upload
DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;
CREATE POLICY "Authenticated users can upload item images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'item-images');

-- Claim Proofs: Authenticated upload
DROP POLICY IF EXISTS "Authenticated users can upload claim proofs" ON storage.objects;
CREATE POLICY "Authenticated users can upload claim proofs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'claim-proofs');

-- Claim Proofs: Authenticated select
DROP POLICY IF EXISTS "Claim proofs viewable by claim owners and reviewers" ON storage.objects;
CREATE POLICY "Claim proofs viewable by claim owners and reviewers" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'claim-proofs');
