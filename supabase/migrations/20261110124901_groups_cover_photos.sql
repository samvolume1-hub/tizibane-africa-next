alter table public.groups
  add column if not exists cover_path text;

create or replace function public.can_view_photo_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.posts p
    where p.photo_path = object_name
      and public.can_view_post(p.author_id, p.visibility, p.group_id)
  )
  or exists (
    select 1 from public.stories s
    where s.photo_path = object_name
      and s.expires_at > now()
      and public.can_view_post(s.author_id, s.visibility, null)
  )
  or exists (
    select 1 from public.profiles p
    where (p.avatar_path = object_name or p.cover_path = object_name)
      and public.can_view_profile(p.id)
  )
  or exists (
    select 1 from public.ad_campaigns a
    where a.photo_path = object_name
      and a.status = 'approved'
      and a.payment_status = 'paid'
      and a.starts_at <= now()
      and a.ends_at > now()
  )
  or exists (
    select 1 from public.groups g
    where g.cover_path = object_name
      and (
        g.owner_id = auth.uid()
        or g.visibility = 'public'
        or public.is_group_member(g.id, auth.uid())
        or public.is_group_manager(g.id)
      )
  );
$function$;
