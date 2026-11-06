-- Keep unpublished Premium advertisement images private.
-- Published, paid, non-expired listings remain visible to signed-in TIZIBANE members.
update storage.buckets
set public = false
where id = 'premium-marketplace';

drop policy if exists premium_marketplace_member_read on storage.objects;
create policy premium_marketplace_member_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'premium-marketplace'
  and (
    public.is_current_platform_admin()
    or exists (
      select 1
      from public.premium_products p
      where p.status = 'published'
        and p.payment_status = 'paid'
        and (p.expires_at is null or p.expires_at > now())
        and name = any (p.image_paths)
    )
  )
);
