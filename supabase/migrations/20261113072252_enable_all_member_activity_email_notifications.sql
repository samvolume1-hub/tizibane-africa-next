create table if not exists private.activity_email_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.notifications(id) on delete cascade,
  recipient_email text not null,
  kind text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz
);
create index if not exists activity_email_queue_pending_idx on private.activity_email_queue (created_at) where status in ('pending','processing');
alter table private.activity_email_queue enable row level security;
revoke all on private.activity_email_queue from public, anon, authenticated;

create or replace function private.queue_activity_email_notification()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  if new.kind in ('spotlight_new','spotlight_updated','spotlight_digest') then return new; end if;
  insert into private.activity_email_queue(notification_id,recipient_email,kind,metadata)
  select new.id,u.email,new.kind,coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object(
    'actor_name',case when new.actor_id is null then 'TIZIBANE'
      else coalesce(nullif(p.display_name,''),nullif(p.handle,''),'A community member') end)
  from auth.users u left join public.profiles p on p.id=new.actor_id
  where u.id=new.recipient_id and u.deleted_at is null and u.email is not null
    and u.email_confirmed_at is not null and length(u.email)<=320
  on conflict(notification_id) do nothing;
  return new;
end;
$function$;

drop trigger if exists queue_activity_email_after_notification on public.notifications;
create trigger queue_activity_email_after_notification after insert on public.notifications
for each row execute function private.queue_activity_email_notification();

create or replace function public.claim_activity_email_batch(p_limit integer,p_token text)
returns table(id uuid,recipient_email text,kind text,metadata jsonb,attempts integer)
language plpgsql security definer set search_path = ''
as $function$
declare v_expected text;
begin
  select decrypted_secret into v_expected from vault.decrypted_secrets
  where name='tizibane_spotlight_cron_token' limit 1;
  if v_expected is null or p_token is null or v_expected<>p_token then
    raise exception 'Worker authorization required' using errcode='42501';
  end if;
  update private.activity_email_queue q set status='failed',
    last_error='Delivery worker stopped after the final retry',updated_at=pg_catalog.now()
  where q.status='processing' and q.attempts>=8 and q.claimed_at<pg_catalog.now()-interval '15 minutes';
  return query
  with candidates as (
    select q.id from private.activity_email_queue q where q.attempts<8 and
      (q.status='pending' or (q.status='processing' and q.claimed_at<pg_catalog.now()-interval '15 minutes'))
    order by q.created_at for update skip locked limit least(greatest(coalesce(p_limit,30),1),50)
  )
  update private.activity_email_queue q set status='processing',attempts=q.attempts+1,
    claimed_at=pg_catalog.now(),updated_at=pg_catalog.now()
  from candidates c where q.id=c.id
  returning q.id,q.recipient_email,q.kind,q.metadata,q.attempts;
end;
$function$;

create or replace function public.complete_activity_email(p_id uuid,p_sent boolean,p_error text,p_token text)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare v_expected text;
begin
  select decrypted_secret into v_expected from vault.decrypted_secrets
  where name='tizibane_spotlight_cron_token' limit 1;
  if v_expected is null or p_token is null or v_expected<>p_token then
    raise exception 'Worker authorization required' using errcode='42501';
  end if;
  update private.activity_email_queue set status=case when p_sent then 'sent' when attempts>=8 then 'failed' else 'pending' end,
    sent_at=case when p_sent then pg_catalog.now() else sent_at end,
    last_error=case when p_sent then null else pg_catalog.left(coalesce(p_error,'Delivery failed'),500) end,
    updated_at=pg_catalog.now()
  where id=p_id and status='processing';
  return found;
end;
$function$;

revoke all on function public.claim_activity_email_batch(integer,text) from public,anon,authenticated;
revoke all on function public.complete_activity_email(uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.claim_activity_email_batch(integer,text) to service_role;
grant execute on function public.complete_activity_email(uuid,boolean,text,text) to service_role;

select cron.schedule('tizibane-activity-email-notification-worker','*/5 * * * *',$job$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_project_url')||'/functions/v1/activity-email-notification-worker',
    headers:=jsonb_build_object('Content-Type','application/json',
      'apikey',(select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_publishable_key'),
      'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_publishable_key'),
      'x-tizibane-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_cron_token')),
    body:='{}'::jsonb,timeout_milliseconds:=45000);
$job$);
