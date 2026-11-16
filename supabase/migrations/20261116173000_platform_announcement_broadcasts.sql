-- Broadcast each published platform announcement once to every active member.
-- Existing notification triggers fan out to in-app, confirmed-email, and subscribed push channels.

create table if not exists private.platform_announcement_broadcasts (
  announcement_id uuid primary key references public.community_announcements(id) on delete cascade,
  sent_by uuid not null references auth.users(id) on delete restrict,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  created_at timestamptz not null default now()
);

alter table private.platform_announcement_broadcasts enable row level security;
revoke all on private.platform_announcement_broadcasts from public, anon, authenticated;
grant all on private.platform_announcement_broadcasts to service_role;

create or replace function public.broadcast_platform_announcement(p_announcement_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_title text;
  v_body text;
  v_status text;
  v_count integer := 0;
begin
  if v_actor is null or not private.is_platform_admin(v_actor) then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  select a.title, a.body, a.status
    into v_title, v_body, v_status
  from public.community_announcements a
  where a.id = p_announcement_id
  for update;

  if not found or v_status <> 'published' then
    raise exception 'Only published announcements can be broadcast' using errcode = '22023';
  end if;

  insert into private.platform_announcement_broadcasts(announcement_id, sent_by)
  values (p_announcement_id, v_actor)
  on conflict (announcement_id) do nothing;

  if not found then
    return 0;
  end if;

  insert into public.notifications(recipient_id, actor_id, kind, subject_id, metadata)
  select
    u.id,
    null,
    'platform_update',
    p_announcement_id,
    jsonb_build_object(
      'title', pg_catalog.left(v_title, 140),
      'body', pg_catalog.left(v_body, 8000),
      'url', '/home/announcements',
      'announcement_id', p_announcement_id
    )
  from auth.users u
  where u.deleted_at is null
    and coalesce(u.is_anonymous, false) = false;

  get diagnostics v_count = row_count;

  update private.platform_announcement_broadcasts
  set recipient_count = v_count
  where announcement_id = p_announcement_id;

  return v_count;
end;
$function$;

revoke all on function public.broadcast_platform_announcement(uuid) from public, anon;
grant execute on function public.broadcast_platform_announcement(uuid) to authenticated;
