-- Collect Spotlight discoveries quietly and deliver one consolidated digest every 12 hours.
-- Feed discovery remains on the existing 30-minute schedule; members are not notified per story.

alter table private.spotlight_scheduled_feed_items
  drop constraint if exists spotlight_scheduled_feed_items_category_id_check;
alter table private.spotlight_scheduled_feed_items
  add constraint spotlight_scheduled_feed_items_category_id_check
  check (category_id = any (array[
    'music-reviews','sports-feed','chipata-activities','zambian-politics','learn-trading','business-hub'
  ]));

create table if not exists private.spotlight_digest_pending (
  item_key text primary key check (item_key ~ '^[0-9a-f]{64}$'),
  category_id text not null,
  category text not null,
  title text not null,
  source text not null default '',
  published_at text not null default '',
  summary text not null default '',
  article_url text not null check (article_url like 'https://%'),
  change_kind text not null check (change_kind in ('new','updated')),
  queued_at timestamptz not null default now()
);
alter table private.spotlight_digest_pending enable row level security;
revoke all on table private.spotlight_digest_pending from public, anon, authenticated;

create table if not exists private.spotlight_digest_state (
  singleton boolean primary key default true check (singleton),
  last_digest_at timestamptz not null default now()
);
alter table private.spotlight_digest_state enable row level security;
revoke all on table private.spotlight_digest_state from public, anon, authenticated;
insert into private.spotlight_digest_state(singleton,last_digest_at)
values (true, now())
on conflict (singleton) do nothing;

-- The email queue now stores one digest email per member, not one email per story.
alter table private.spotlight_email_queue
  drop constraint if exists spotlight_email_queue_kind_check;
alter table private.spotlight_email_queue
  add constraint spotlight_email_queue_kind_check
  check (kind in ('spotlight_new','spotlight_updated','spotlight_digest'));

-- Discard any unsent per-story email backlog so the first run after this change
-- cannot unexpectedly send a burst of individual messages.
update private.spotlight_email_queue
set status='failed',
    last_error='Replaced by the 12-hour Spotlight digest',
    updated_at=now()
where status in ('pending','processing')
  and kind in ('spotlight_new','spotlight_updated');

create or replace function private.queue_spotlight_email_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.kind not in ('spotlight_new','spotlight_updated','spotlight_digest') then
    return new;
  end if;

  insert into private.spotlight_email_queue(notification_id, recipient_email, kind, metadata)
  select new.id, u.email, new.kind, coalesce(new.metadata, '{}'::jsonb)
  from auth.users u
  where u.id = new.recipient_id
    and u.deleted_at is null
    and u.email is not null
    and u.email_confirmed_at is not null
    and length(u.email) <= 320
  on conflict (notification_id) do nothing;

  return new;
end;
$function$;

create or replace function public.process_spotlight_feed(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_item jsonb;
  v_key text;
  v_fingerprint text;
  v_previous text;
  v_seed boolean;
  v_kind text;
  v_new integer:=0;
  v_changed integer:=0;
  v_sent integer:=0;
  v_rows integer;
  v_digest_at timestamptz;
  v_digest_items jsonb;
  v_digest_count integer:=0;
begin
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Invalid Spotlight feed payload' using errcode='22023';
  end if;
  if jsonb_array_length(p_items)>30 then
    raise exception 'Spotlight feed payload is too large' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('tizibane-spotlight-feed-sync'));
  select not exists(select 1 from private.spotlight_scheduled_feed_items) into v_seed;
  select last_digest_at into v_digest_at
  from private.spotlight_digest_state
  where singleton=true
  for update;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_key:=v_item->>'item_key';
    v_fingerprint:=v_item->>'fingerprint';
    if coalesce(v_key,'') !~ '^[0-9a-f]{64}$'
      or coalesce(v_fingerprint,'') !~ '^[0-9a-f]{64}$'
      or coalesce(v_item->>'category_id','') not in (
        'music-reviews','sports-feed','chipata-activities','zambian-politics','learn-trading','business-hub'
      )
      or coalesce(v_item->>'title','')=''
      or length(v_item->>'title')>240
      or coalesce(v_item->>'article_url','') not like 'https://%'
      or length(v_item->>'article_url')>2048 then
      raise exception 'Invalid Spotlight feed item' using errcode='22023';
    end if;

    select fingerprint into v_previous
    from private.spotlight_scheduled_feed_items
    where item_key=v_key
    for update;

    if not found then
      insert into private.spotlight_scheduled_feed_items
        (item_key,category_id,category,title,source,published_at,summary,article_url,fingerprint)
      values (
        v_key,v_item->>'category_id',left(coalesce(v_item->>'category','Spotlight'),100),
        left(v_item->>'title',240),left(coalesce(v_item->>'source',''),100),
        left(coalesce(v_item->>'published_at',''),100),left(coalesce(v_item->>'summary',''),900),
        v_item->>'article_url',v_fingerprint
      );
      if not v_seed then v_kind:='new'; end if;
    elsif v_previous is distinct from v_fingerprint then
      update private.spotlight_scheduled_feed_items
      set category_id=v_item->>'category_id',
          category=left(coalesce(v_item->>'category','Spotlight'),100),
          title=left(v_item->>'title',240),
          source=left(coalesce(v_item->>'source',''),100),
          published_at=left(coalesce(v_item->>'published_at',''),100),
          summary=left(coalesce(v_item->>'summary',''),900),
          article_url=v_item->>'article_url',
          fingerprint=v_fingerprint,
          last_seen_at=now()
      where item_key=v_key;
      v_kind:='updated';
    else
      update private.spotlight_scheduled_feed_items
      set last_seen_at=now()
      where item_key=v_key;
    end if;

    if v_kind is not null then
      insert into private.spotlight_digest_pending
        (item_key,category_id,category,title,source,published_at,summary,article_url,change_kind,queued_at)
      values (
        v_key,v_item->>'category_id',left(coalesce(v_item->>'category','Spotlight'),100),
        left(v_item->>'title',240),left(coalesce(v_item->>'source',''),100),
        left(coalesce(v_item->>'published_at',''),100),left(coalesce(v_item->>'summary',''),900),
        v_item->>'article_url',v_kind,now()
      )
      on conflict (item_key) do update set
        category_id=excluded.category_id,
        category=excluded.category,
        title=excluded.title,
        source=excluded.source,
        published_at=excluded.published_at,
        summary=excluded.summary,
        article_url=excluded.article_url,
        change_kind=case
          when spotlight_digest_pending.change_kind='new' then 'new'
          else excluded.change_kind
        end;
      if v_kind='new' then v_new:=v_new+1; else v_changed:=v_changed+1; end if;
      v_kind:=null;
    end if;
  end loop;

  if v_digest_at is not null and now() >= v_digest_at + interval '12 hours' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'item_key',item_key,
      'category_id',category_id,
      'category',category,
      'title',title,
      'source',source,
      'published_at',published_at,
      'summary',summary,
      'article_url',article_url,
      'change_kind',change_kind
    ) order by category,title),'[]'::jsonb),count(*)::integer
    into v_digest_items,v_digest_count
    from private.spotlight_digest_pending;

    if v_digest_count > 0 then
      insert into public.notifications(recipient_id,actor_id,kind,metadata)
      select p.id,null,'spotlight_digest',jsonb_build_object(
        'title','Your 12-hour Spotlight catch-up',
        'item_count',v_digest_count,
        'digest_items',v_digest_items,
        'window_started_at',v_digest_at,
        'window_ended_at',now()
      )
      from public.profiles p
      join auth.users u on u.id=p.id
      where u.deleted_at is null;

      get diagnostics v_rows=row_count;
      v_sent:=v_rows;
      delete from private.spotlight_digest_pending;
      update private.spotlight_digest_state
      set last_digest_at=now()
      where singleton=true;
    end if;
  end if;

  return jsonb_build_object(
    'seeded_baseline',v_seed,
    'new_items_collected',v_new,
    'updated_items_collected',v_changed,
    'digest_items',v_digest_count,
    'digest_notifications_created',v_sent,
    'next_digest_after_hours',12
  );
end;
$function$;

revoke all on function public.process_spotlight_feed(jsonb) from public,anon,authenticated;
grant execute on function public.process_spotlight_feed(jsonb) to service_role;
