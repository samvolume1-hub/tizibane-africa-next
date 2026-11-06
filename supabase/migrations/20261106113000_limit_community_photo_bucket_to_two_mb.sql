-- Enforce the agreed 2 MB hard ceiling at the Storage bucket itself.
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'community-photos';