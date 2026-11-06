-- TIZIBANE content controls, scoped group-event management and unified platform admin.
-- Preserve group moderation deletion while keeping all editing owner-only.

drop policy if exists comment_update_own on public.comments;
create policy comment_update_own on public.comments for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

drop policy if exists story_update_own on public.stories;
create policy story_update_own on public.stories for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

alter table public.events add column if not exists group_id uuid references public.groups(id) on delete cascade;
create index if not exists events_group_id_starts_at_idx on public.events(group_id, starts_at) where group_id is not null;

drop policy if exists event_read on public.events;
create policy event_read on public.events for select to authenticated
using (is_public or organizer_id = (select auth.uid())
  or (group_id is not null and private.is_group_member(group_id))
  or (group_id is not null and private.is_group_manager(group_id))
  or public.is_current_platform_admin());

drop policy if exists event_create on public.events;
create policy event_create on public.events for insert to authenticated
with check (organizer_id = (select auth.uid())
  and (group_id is null or private.is_group_manager(group_id) or public.is_current_platform_admin()));

drop policy if exists event_update on public.events;
create policy event_update on public.events for update to authenticated
using (organizer_id = (select auth.uid())
  or (group_id is not null and private.is_group_manager(group_id))
  or public.is_current_platform_admin())
with check (organizer_id = (select auth.uid())
  or (group_id is not null and private.is_group_manager(group_id))
  or public.is_current_platform_admin());

drop policy if exists event_delete on public.events;
create policy event_delete on public.events for delete to authenticated
using (organizer_id = (select auth.uid())
  or (group_id is not null and private.is_group_manager(group_id))
  or public.is_current_platform_admin());

create or replace function public.prevent_event_group_reassignment()
returns trigger language plpgsql set search_path = ''
as $function$
begin
  if new.group_id is distinct from old.group_id then
    raise exception 'An event cannot be moved to a different group after creation';
  end if;
  return new;
end;
$function$;
drop trigger if exists events_group_id_immutable on public.events;
create trigger events_group_id_immutable before update of group_id on public.events
for each row execute function public.prevent_event_group_reassignment();
grant execute on function public.prevent_event_group_reassignment() to authenticated;

drop policy if exists premium_products_admin_delete on public.premium_products;
create policy premium_products_admin_delete on public.premium_products for delete to authenticated
using (public.is_current_platform_admin());

drop policy if exists premium_products_admin_insert on public.premium_products;
create policy premium_products_admin_insert on public.premium_products for insert to authenticated
with check (created_by = (select auth.uid()) and public.is_current_platform_admin());

drop policy if exists premium_products_public_read on public.premium_products;
create policy premium_products_public_read on public.premium_products for select to authenticated
using ((status = 'published' and payment_status = 'paid' and (expires_at is null or expires_at > now()))
  or public.is_current_platform_admin());

drop policy if exists premium_products_admin_update on public.premium_products;
create policy premium_products_admin_update on public.premium_products for update to authenticated
using (public.is_current_platform_admin())
with check (public.is_current_platform_admin());

drop policy if exists premium_marketplace_admin_delete on storage.objects;
create policy premium_marketplace_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'premium-marketplace' and public.is_current_platform_admin());

drop policy if exists premium_marketplace_admin_update on storage.objects;
create policy premium_marketplace_admin_update on storage.objects for update to authenticated
using (bucket_id = 'premium-marketplace' and public.is_current_platform_admin())
with check (bucket_id = 'premium-marketplace' and public.is_current_platform_admin());

drop policy if exists premium_marketplace_admin_upload on storage.objects;
create policy premium_marketplace_admin_upload on storage.objects for insert to authenticated
with check (bucket_id = 'premium-marketplace' and public.is_current_platform_admin()
  and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp']));

drop policy if exists group_manager_delete_group_photo on storage.objects;
create policy group_manager_delete_group_photo on storage.objects for delete to authenticated
using (bucket_id = 'community-photos'
  and (storage.foldername(name))[2] = 'groups'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.is_group_manager(((storage.foldername(name))[3])::uuid));
