-- Queue email copies of Spotlight notifications without changing in-app delivery.
-- The queue is private and only service-role Edge Functions can claim or complete jobs.

create table if not exists private.spotlight_email_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.notifications(id) on delete cascade,
  recipient_email text not null,
  kind text not null check (kind in ('spotlight_new','spotlight_updated')),
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz
);

create index if not exists spotlight_email_queue_pending_idx
  on private.spotlight_email_queue(status, created_at)
  where status in ('pending','processing');

alter table private.spotlight_email_queue enable row level security;
revoke all on table private.spotlight_email_queue from public, anon, authenticated;

create or replace function private.queue_spotlight_email_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.kind not in ('spotlight_new','spotlight_updated') then
    return new;
  end if;

  insert into private.spotlight_email_queue(notification_id, recipient_email, kind, metadata)
  select new.id, u.email, new.kind, coalesce(new.metadata, '{}'::jsonb)
  from auth.users u
  where u.id = new.recipient_id
    and u.deleted_at is null
    and u.email is not null
    and length(u.email) <= 320
  on conflict (notification_id) do nothing;

  return new;
end;
$function$;

revoke all on function private.queue_spotlight_email_notification() from public, anon, authenticated;

drop trigger if exists queue_spotlight_email_after_notification on public.notifications;
create trigger queue_spotlight_email_after_notification
after insert on public.notifications
for each row execute function private.queue_spotlight_email_notification();

create or replace function public.claim_spotlight_email_batch(p_limit integer default 30)
returns table(id uuid, recipient_email text, kind text, metadata jsonb, attempts integer)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  return query
  with candidates as (
    select q.id
    from private.spotlight_email_queue q
    where q.attempts < 8
      and (q.status = 'pending'
        or (q.status = 'processing' and q.claimed_at < now() - interval '15 minutes'))
    order by q.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 30), 1), 50)
  )
  update private.spotlight_email_queue q
  set status = 'processing',
      attempts = q.attempts + 1,
      claimed_at = now(),
      updated_at = now()
  from candidates c
  where q.id = c.id
  returning q.id, q.recipient_email, q.kind, q.metadata, q.attempts;
end;
$function$;

create or replace function public.complete_spotlight_email(p_id uuid, p_sent boolean, p_error text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  update private.spotlight_email_queue
  set status = case
        when p_sent then 'sent'
        when attempts >= 8 then 'failed'
        else 'pending'
      end,
      sent_at = case when p_sent then now() else sent_at end,
      last_error = case when p_sent then null else left(coalesce(p_error, 'Delivery failed'), 500) end,
      updated_at = now()
  where id = p_id
    and status = 'processing';

  return found;
end;
$function$;

revoke all on function public.claim_spotlight_email_batch(integer) from public, anon, authenticated;
revoke all on function public.complete_spotlight_email(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_spotlight_email_batch(integer) to service_role;
grant execute on function public.complete_spotlight_email(uuid, boolean, text) to service_role;
