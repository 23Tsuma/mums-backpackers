/*
# Tighten owner property table privileges

1. Scope
- Adjusts grants on the existing `public.properties` and `public.property_images` tables.
- No records, columns, or relationships are removed or changed.

2. Public access
- Anonymous visitors retain SELECT access so published property content can be displayed on the website.

3. Owner access
- Signed-in owners retain only the INSERT, UPDATE, and DELETE operations required by the management workspace.
- Property text updates are limited to `name` and `description`.
- Image creation is limited to `property_id`, `storage_path`, and `alt_text`; ownership remains database-derived from the session.
- Image updates are limited to `alt_text`.

4. Security
- Removes broad table-level grants from `anon` and `authenticated` before adding the minimum required privileges.
- Existing row-level security policies continue to enforce which records each signed-in owner can access.
*/

REVOKE ALL ON public.properties FROM anon, authenticated;
REVOKE ALL ON public.property_images FROM anon, authenticated;

GRANT SELECT ON public.properties TO anon, authenticated;
GRANT INSERT (name, description) ON public.properties TO authenticated;
GRANT UPDATE (name, description) ON public.properties TO authenticated;
GRANT DELETE ON public.properties TO authenticated;

GRANT SELECT ON public.property_images TO anon, authenticated;
GRANT INSERT (property_id, storage_path, alt_text) ON public.property_images TO authenticated;
GRANT UPDATE (alt_text) ON public.property_images TO authenticated;
GRANT DELETE ON public.property_images TO authenticated;
