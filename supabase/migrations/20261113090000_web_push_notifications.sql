create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null check (length(endpoint) <= 2048 and endpoint ~ '^https://(fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|web[.]push[.]apple[.]com|[a-z0-9.-]+[.]notify[.]windows[.]com)/'),
  subscription jsonb not null check (
    jsonb_typeof(subscription) = 'object'
    and subscription->>'endpoint' = endpoint
    and jsonb_typeof(subscription->'keys') = 'object'
    and coalesce(length(subscription->'keys'->>'p256dh') between 32 and 256,false)
    and coalesce(length(subscription->'keys'->>'auth') between 16 and 256,false)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

alter table public.web_push_subscriptions enable row level security;
revoke all on public.web_push_subscriptions from public, anon;
grant select, insert, update, delete on public.web_push_subscriptions to authenticated;
grant all on public.web_push_subscriptions to service_role;

drop policy if exists "Members manage their own web push subscriptions" on public.web_push_subscriptions;
create policy "Members manage their own web push subscriptions"
on public.web_push_subscriptions
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);


create or replace function private.register_web_push_subscription(p_endpoint text,p_subscription jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if p_endpoint is null
     or length(p_endpoint) > 2048
     or p_endpoint !~ '^https://(fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|web[.]push[.]apple[.]com|[a-z0-9.-]+[.]notify[.]windows[.]com)/'
     or jsonb_typeof(p_subscription) <> 'object'
     or p_subscription->>'endpoint' <> p_endpoint
     or jsonb_typeof(p_subscription->'keys') <> 'object'
     or not coalesce(length(p_subscription->'keys'->>'p256dh') between 32 and 256,false)
     or not coalesce(length(p_subscription->'keys'->>'auth') between 16 and 256,false) then
    raise exception 'Invalid web push subscription' using errcode='22023';
  end if;

  insert into public.web_push_subscriptions(user_id,endpoint,subscription,updated_at)
  values (v_user_id,p_endpoint,p_subscription,pg_catalog.now())
  on conflict (endpoint) do update
    set user_id=excluded.user_id,
        subscription=excluded.subscription,
        updated_at=pg_catalog.now();

  return true;
end;
$function$;

revoke all on function private.register_web_push_subscription(text,jsonb) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.register_web_push_subscription(text,jsonb) to authenticated;

create or replace function public.register_web_push_subscription(p_endpoint text,p_subscription jsonb)
returns boolean
language sql
security invoker
set search_path = ''
as $function$
  select private.register_web_push_subscription(p_endpoint,p_subscription);
$function$;

revoke all on function public.register_web_push_subscription(text,jsonb) from public,anon;
grant execute on function public.register_web_push_subscription(text,jsonb) to authenticated;

create index if not exists web_push_subscriptions_user_idx
on public.web_push_subscriptions (user_id);

create table if not exists private.web_push_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.notifications(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
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

create index if not exists web_push_queue_pending_idx
on private.web_push_queue (created_at)
where status in ('pending','processing');

alter table private.web_push_queue enable row level security;
revoke all on private.web_push_queue from public, anon, authenticated;
grant all on private.web_push_queue to service_role;

create or replace function private.queue_web_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.kind like 'spotlight_%' then
    return new;
  end if;

  if not exists (select 1 from public.web_push_subscriptions s where s.user_id=new.recipient_id) then
    return new;
  end if;

  insert into private.web_push_queue(notification_id,recipient_id,actor_id,kind,metadata)
  values (new.id,new.recipient_id,new.actor_id,new.kind,coalesce(new.metadata,'{}'::jsonb))
  on conflict (notification_id) do nothing;

  return new;
end;
$function$;

revoke all on function private.queue_web_push_notification() from public, anon, authenticated;

drop trigger if exists queue_web_push_after_notification on public.notifications;
create trigger queue_web_push_after_notification
after insert on public.notifications
for each row execute function private.queue_web_push_notification();

create or replace function public.claim_web_push_batch(p_limit integer,p_token text)
returns table(id uuid,notification_id uuid,recipient_id uuid,actor_id uuid,kind text,metadata jsonb,attempts integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_expected text;
begin
  select decrypted_secret into v_expected
  from vault.decrypted_secrets
  where name='tizibane_spotlight_cron_token'
  limit 1;

  if v_expected is null or p_token is null or v_expected<>p_token then
    raise exception 'Worker authorization required' using errcode='42501';
  end if;

  update private.web_push_queue q
  set status='failed',last_error='Push worker stopped after the final retry',updated_at=pg_catalog.now()
  where q.status='processing' and q.attempts>=6
    and q.claimed_at<pg_catalog.now()-interval '15 minutes';

  return query
  with candidates as (
    select q.id
    from private.web_push_queue q
    where q.attempts<6
      and (q.status='pending' or (q.status='processing' and q.claimed_at<pg_catalog.now()-interval '15 minutes'))
    order by q.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit,30),1),50)
  )
  update private.web_push_queue q
  set status='processing',attempts=q.attempts+1,claimed_at=pg_catalog.now(),updated_at=pg_catalog.now()
  from candidates c
  where q.id=c.id
  returning q.id,q.notification_id,q.recipient_id,q.actor_id,q.kind,q.metadata,q.attempts;
end;
$function$;

create or replace function public.complete_web_push_delivery(p_id uuid,p_sent boolean,p_error text,p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_expected text;
begin
  select decrypted_secret into v_expected
  from vault.decrypted_secrets
  where name='tizibane_spotlight_cron_token'
  limit 1;

  if v_expected is null or p_token is null or v_expected<>p_token then
    raise exception 'Worker authorization required' using errcode='42501';
  end if;

  update private.web_push_queue
  set status=case when p_sent then 'sent' when attempts>=6 then 'failed' else 'pending' end,
      sent_at=case when p_sent then pg_catalog.now() else sent_at end,
      last_error=case when p_sent then null else pg_catalog.left(coalesce(p_error,'Push delivery failed'),500) end,
      updated_at=pg_catalog.now()
  where id=p_id and status='processing';

  return found;
end;
$function$;

revoke all on function public.claim_web_push_batch(integer,text) from public,anon,authenticated;
revoke all on function public.complete_web_push_delivery(uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.claim_web_push_batch(integer,text) to service_role;
grant execute on function public.complete_web_push_delivery(uuid,boolean,text,text) to service_role;

select cron.schedule(
  'tizibane-web-push-notification-worker',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url:=(select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_project_url')||'/functions/v1/web-push-notification-worker',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'apikey',(select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_publishable_key'),
        'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_publishable_key'),
        'x-tizibane-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_cron_token')
      ),
      body:='{}'::jsonb,
      timeout_milliseconds:=45000
    );
  $job$
);
