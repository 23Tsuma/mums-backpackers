/*
# Create owner-managed properties and image storage

1. New Tables
- `public.properties` stores accommodation listings created by signed-in owners.
- `public.properties.id` is the property identifier.
- `public.properties.owner_id` identifies the authenticated account that owns the listing and defaults from the current session.
- `public.properties.name` is the property name shown to visitors.
- `public.properties.description` is the public property description.
- `public.properties.created_at` and `public.properties.updated_at` track record history.
- `public.property_images` stores the image records belonging to each property.
- `public.property_images.id` is the image record identifier.
- `public.property_images.property_id` links an image to a property and cascades when that property is removed.
- `public.property_images.owner_id` identifies the authenticated account that owns the image record.
- `public.property_images.storage_path` is the path of the image in the protected upload namespace.
- `public.property_images.alt_text` is the accessible description for the image.
- `public.property_images.created_at` tracks when the image was added.

2. Storage
- Creates the public `property-images` bucket for visitor-facing property photos.
- Limits uploads to common image formats and 5 MB per file.
- Upload paths must begin with the signed-in account id, preventing cross-account writes.

3. Security
- Enables row level security on both new tables.
- Public visitors can read published property details and image records.
- Signed-in owners can only create, read, update, and delete their own property records and images.
- Storage uploads, replacements, and removals are restricted to the account folder in each object path.
- Grants are limited to the roles and operations used by the application.

4. Important Notes
- The application uses Supabase email/password authentication; no custom user table is created.
- Property and image ownership is derived from `auth.uid()` rather than trusted from browser input.
- The storage bucket is public because these photos are intended for the public accommodation website; write access remains owner-scoped.
*/

CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  alt_text text NOT NULL DEFAULT '' CHECK (char_length(alt_text) <= 240),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS properties_owner_id_idx ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS property_images_property_id_idx ON public.property_images(property_id);
CREATE INDEX IF NOT EXISTS property_images_owner_id_idx ON public.property_images(owner_id);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.properties TO anon, authenticated;
GRANT INSERT (name, description) ON public.properties TO authenticated;
GRANT UPDATE (name, description) ON public.properties TO authenticated;
GRANT DELETE ON public.properties TO authenticated;

GRANT SELECT ON public.property_images TO anon, authenticated;
GRANT INSERT (property_id, storage_path, alt_text) ON public.property_images TO authenticated;
GRANT UPDATE (alt_text) ON public.property_images TO authenticated;
GRANT DELETE ON public.property_images TO authenticated;

DROP POLICY IF EXISTS "Public can view properties" ON public.properties;
CREATE POLICY "Public can view properties" ON public.properties FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Owners can create properties" ON public.properties;
CREATE POLICY "Owners can create properties" ON public.properties FOR INSERT
TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update properties" ON public.properties;
CREATE POLICY "Owners can update properties" ON public.properties FOR UPDATE
TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete properties" ON public.properties;
CREATE POLICY "Owners can delete properties" ON public.properties FOR DELETE
TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Public can view property images" ON public.property_images;
CREATE POLICY "Public can view property images" ON public.property_images FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Owners can create property images" ON public.property_images;
CREATE POLICY "Owners can create property images" ON public.property_images FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = owner_id
  AND EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_images.property_id AND properties.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Owners can update property images" ON public.property_images;
CREATE POLICY "Owners can update property images" ON public.property_images FOR UPDATE
TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete property images" ON public.property_images;
CREATE POLICY "Owners can delete property images" ON public.property_images FOR DELETE
TO authenticated USING (auth.uid() = owner_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('property-images', 'property-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view property images storage" ON storage.objects;
CREATE POLICY "Public can view property images storage" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "Owners can upload property images storage" ON storage.objects;
CREATE POLICY "Owners can upload property images storage" ON storage.objects FOR INSERT
TO authenticated WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Owners can replace property images storage" ON storage.objects;
CREATE POLICY "Owners can replace property images storage" ON storage.objects FOR UPDATE
TO authenticated USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
) WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Owners can delete property images storage" ON storage.objects;
CREATE POLICY "Owners can delete property images storage" ON storage.objects FOR DELETE
TO authenticated USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
