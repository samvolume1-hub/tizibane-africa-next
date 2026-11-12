-- Automatic Spotlight notifications for every registered TIZIBANE member.
-- No Spotlight page or layout changes are made by this migration.
create extension if not exists pg_net;

create table if not exists private.spotlight_scheduled_feed_items (
  item_key text primary key check (item_key ~ '^[0-9a-f]{64}$'),
  category_id text not null check (category_id = any (array['music-reviews','sports-feed','chipata-activities','zambian-politics','learn-trading'])),
  category text not null, title text not null, source text not null default '',
  published_at text not null default '', summary text not null default '',
  article_url text not null check (article_url like 'https://%'),
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now()
);
alter table private.spotlight_scheduled_feed_items enable row level security;
revoke all on table private.spotlight_scheduled_feed_items from public, anon, authenticated;

create unique index if not exists notifications_spotlight_delivery_unique_idx
  on public.notifications (recipient_id,(metadata->>'spotlight_item_id'),(metadata->>'fingerprint'))
  where kind in ('spotlight_new','spotlight_updated')
    and metadata ? 'spotlight_item_id' and metadata ? 'fingerprint';

create or replace function public.process_spotlight_feed(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_item jsonb; v_key text; v_fingerprint text; v_previous text;
  v_seed boolean; v_kind text; v_new integer:=0; v_changed integer:=0;
  v_sent integer:=0; v_rows integer; v_recipients integer:=0;
begin
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Invalid Spotlight feed payload' using errcode='22023';
  end if;
  if jsonb_array_length(p_items)>25 then
    raise exception 'Spotlight feed payload is too large' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('tizibane-spotlight-feed-sync'));
  select not exists(select 1 from private.spotlight_scheduled_feed_items) into v_seed;
  select count(*)::integer into v_recipients
  from public.profiles p join auth.users u on u.id=p.id where u.deleted_at is null;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_key:=v_item->>'item_key'; v_fingerprint:=v_item->>'fingerprint';
    if coalesce(v_key,'') !~ '^[0-9a-f]{64}$'
      or coalesce(v_fingerprint,'') !~ '^[0-9a-f]{64}$'
      or coalesce(v_item->>'category_id','') not in ('music-reviews','sports-feed','chipata-activities','zambian-politics','learn-trading')
      or coalesce(v_item->>'title','')='' or length(v_item->>'title')>240
      or coalesce(v_item->>'article_url','') not like 'https://%'
      or length(v_item->>'article_url')>2048 then
      raise exception 'Invalid Spotlight feed item' using errcode='22023';
    end if;

    select fingerprint into v_previous from private.spotlight_scheduled_feed_items where item_key=v_key for update;
    if not found then
      insert into private.spotlight_scheduled_feed_items
        (item_key,category_id,category,title,source,published_at,summary,article_url,fingerprint)
      values (v_key,v_item->>'category_id',left(coalesce(v_item->>'category','Spotlight'),100),
        left(v_item->>'title',240),left(coalesce(v_item->>'source',''),100),
        left(coalesce(v_item->>'published_at',''),100),left(coalesce(v_item->>'summary',''),900),
        v_item->>'article_url',v_fingerprint);
      if not v_seed then v_kind:='spotlight_new'; end if;
    elsif v_previous is distinct from v_fingerprint then
      update private.spotlight_scheduled_feed_items set category_id=v_item->>'category_id',
        category=left(coalesce(v_item->>'category','Spotlight'),100),title=left(v_item->>'title',240),
        source=left(coalesce(v_item->>'source',''),100),published_at=left(coalesce(v_item->>'published_at',''),100),
        summary=left(coalesce(v_item->>'summary',''),900),article_url=v_item->>'article_url',
        fingerprint=v_fingerprint,last_seen_at=now() where item_key=v_key;
      v_kind:='spotlight_updated';
    else
      update private.spotlight_scheduled_feed_items set last_seen_at=now() where item_key=v_key;
    end if;

    if v_kind is not null then
      insert into public.notifications(recipient_id,actor_id,kind,metadata)
      select p.id,null,v_kind,jsonb_build_object(
        'spotlight_item_id',v_key,'fingerprint',v_fingerprint,
        'category_id',v_item->>'category_id','category',left(coalesce(v_item->>'category','Spotlight'),100),
        'title',left(v_item->>'title',240),'source',left(coalesce(v_item->>'source',''),100),
        'published_at',left(coalesce(v_item->>'published_at',''),100),
        'summary',left(coalesce(v_item->>'summary',''),900),'article_url',v_item->>'article_url')
      from public.profiles p join auth.users u on u.id=p.id where u.deleted_at is null
      on conflict (recipient_id,(metadata->>'spotlight_item_id'),(metadata->>'fingerprint'))
      where kind in ('spotlight_new','spotlight_updated')
        and metadata ? 'spotlight_item_id' and metadata ? 'fingerprint'
      do nothing;
      get diagnostics v_rows=row_count; v_sent:=v_sent+v_rows;
      if v_kind='spotlight_new' then v_new:=v_new+1; else v_changed:=v_changed+1; end if;
      v_kind:=null;
    end if;
  end loop;

  return jsonb_build_object('seeded_baseline',v_seed,'new_items',v_new,
    'updated_items',v_changed,'notifications_created',v_sent,'registered_recipients',v_recipients);
end;
$function$;
revoke all on function public.process_spotlight_feed(jsonb) from public,anon,authenticated;
grant execute on function public.process_spotlight_feed(jsonb) to service_role;

create or replace function public.validate_spotlight_cron_token(p_token text)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare v_expected text;
begin
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then return false; end if;
  select decrypted_secret into v_expected from vault.decrypted_secrets
  where name='tizibane_spotlight_cron_token' limit 1;
  return v_expected is not null and p_token is not null and v_expected=p_token;
end;
$function$;
revoke all on function public.validate_spotlight_cron_token(text) from public,anon,authenticated;
grant execute on function public.validate_spotlight_cron_token(text) to service_role;

do $vault$
begin
  if not exists(select 1 from vault.secrets where name='tizibane_spotlight_cron_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),
      'tizibane_spotlight_cron_token','Private authentication token for scheduled Spotlight sync');
  end if;
  if not exists(select 1 from vault.secrets where name='tizibane_spotlight_project_url') then
    perform vault.create_secret('https://pqgqdhzcpaugxcfokjrk.supabase.co',
      'tizibane_spotlight_project_url','Supabase project URL for scheduled Spotlight sync');
  end if;
  if not exists(select 1 from vault.secrets where name='tizibane_spotlight_publishable_key') then
    perform vault.create_secret('sb_publishable_qkYaoLAG7Bupp4lojHXF3g_Hiaq-u3s',
      'tizibane_spotlight_publishable_key','Publishable key for scheduled Spotlight Edge Function');
  end if;
end;
$vault$;

select cron.schedule('tizibane-spotlight-notification-sync','*/15 * * * *',$job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_project_url')
      || '/functions/v1/spotlight-notification-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey',(select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_publishable_key'),
      'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_publishable_key'),
      'x-tizibane-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='tizibane_spotlight_cron_token')
    ),
    body := '{}'::jsonb, timeout_milliseconds := 90000
  );
$job$);
