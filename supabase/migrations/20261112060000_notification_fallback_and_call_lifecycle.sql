-- Make message notification rows a durable fallback for private inbox broadcasts.
alter table public.notifications
  add column if not exists message_id uuid;

create unique index if not exists notifications_recipient_message_unique_idx
  on public.notifications (recipient_id, message_id)
  where kind = 'message' and message_id is not null;

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.notifications(recipient_id, actor_id, kind, subject_id, message_id)
  select cm.user_id, new.sender_id, 'message', new.conversation_id, new.id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
  on conflict (recipient_id, message_id)
    where kind = 'message' and message_id is not null
    do nothing;
  return new;
end;
$function$;

-- A joined invitee activates the session. If every invite is declined/left
-- before anyone joins, close the call as missed instead of leaving it ringing.
create or replace function private.sync_call_session_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  has_joined_invitee boolean;
  has_pending_invitee boolean;
begin
  if new.status not in ('joined', 'declined', 'left') then
    return new;
  end if;

  select exists (
    select 1
    from public.call_participants cp
    join public.call_sessions cs on cs.id = cp.call_id
    where cp.call_id = new.call_id
      and cp.user_id <> cs.started_by
      and cp.status = 'joined'
  ) into has_joined_invitee;

  select exists (
    select 1
    from public.call_participants cp
    where cp.call_id = new.call_id
      and cp.status = 'invited'
  ) into has_pending_invitee;

  if has_joined_invitee then
    update public.call_sessions
    set status = 'active', ended_at = null
    where id = new.call_id and status = 'ringing';
  elsif not has_pending_invitee then
    update public.call_sessions
    set status = 'missed', ended_at = coalesce(ended_at, now())
    where id = new.call_id and status = 'ringing';
  end if;

  return new;
end;
$function$;

revoke all on function private.sync_call_session_lifecycle() from public, anon, authenticated;

drop trigger if exists sync_call_session_lifecycle on public.call_participants;
create trigger sync_call_session_lifecycle
  after update of status on public.call_participants
  for each row
  when (old.status is distinct from new.status)
  execute function private.sync_call_session_lifecycle();

-- The scheduler marks unanswered group invites individually, while preserving
-- an active group call if at least one invitee has already joined.
alter table public.call_participants
  drop constraint if exists call_participants_status_check;

alter table public.call_participants
  add constraint call_participants_status_check
  check (status = any (array['invited'::text, 'joined'::text, 'declined'::text, 'left'::text, 'missed'::text]));

create or replace function private.expire_stale_call_invites()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.call_participants
  set status = 'missed', left_at = coalesce(left_at, now())
  where status = 'invited'
    and created_at < now() - interval '60 seconds';

  update public.call_sessions cs
  set status = case
        when exists (
          select 1 from public.call_participants cp
          where cp.call_id = cs.id
            and cp.user_id <> cs.started_by
            and cp.status = 'joined'
        ) then 'active'
        else 'missed'
      end,
      ended_at = case
        when exists (
          select 1 from public.call_participants cp
          where cp.call_id = cs.id
            and cp.user_id <> cs.started_by
            and cp.status = 'joined'
        ) then null
        else coalesce(cs.ended_at, now())
      end
  where cs.status = 'ringing'
    and cs.created_at < now() - interval '60 seconds';
end;
$function$;

revoke all on function private.expire_stale_call_invites() from public, anon, authenticated;

-- pg_cron is a built-in Supabase Postgres extension; no external/paid worker.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'tizibane-expire-stale-call-invites',
  '* * * * *',
  'select private.expire_stale_call_invites()'
);
