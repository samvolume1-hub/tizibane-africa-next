-- Detect new and materially updated Spotlight stories and notify every registered member.
-- The first successful sync establishes a baseline and does not send a burst of old stories.

alter table public.notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists private.spotlight_feed_items (
  item_key text primary key,
  topic_id text not null,
  article_url text not null,
  title text not null,
  source text not null,
  summary text not null default '',
  published_at text not null default '',
  fingerprint text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table private.spotlight_feed_items enable row level security;
revoke all on table private.spotlight_feed_items from public, anon, authenticated;

create table if not exists private.spotlight_sync_state (
  singleton boolean primary key default true check (singleton),
  last_synced_at timestamptz
);

alter table private.spotlight_sync_state enable row level security;
revoke all on table private.spotlight_sync_state from public, anon, authenticated;
insert into private.spotlight_sync_state (singleton, last_synced_at)
values (true, null)
on conflict (singleton) do nothing;

create or replace function public.sync_spotlight_notifications(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_item jsonb;
  v_topic_id text;
  v_topic_label text;
  v_article_url text;
  v_title text;
  v_source text;
  v_summary text;
  v_published_at text;
  v_item_key text;
  v_fingerprint text;
  v_previous_fingerprint text;
  v_kind text;
  v_inserted integer;
  v_total integer := 0;
  v_has_baseline boolean;
  v_last_synced_at timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if p_items is null or pg_catalog.jsonb_typeof(p_items) <> 'array'
     or pg_catalog.jsonb_array_length(p_items) = 0
     or pg_catalog.jsonb_array_length(p_items) > 25 then
    raise exception 'Invalid Spotlight feed payload';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as entry(value)
    where coalesce(entry.value ->> 'topic_id', '') not in (
        'music-reviews', 'sports-feed', 'chipata-activities', 'zambian-politics', 'learn-trading'
      )
      or coalesce(entry.value ->> 'article_url', '') !~ '^https://news[.]google[.]com/rss/articles/'
      or pg_catalog.length(coalesce(entry.value ->> 'article_url', '')) > 1000
      or pg_catalog.btrim(coalesce(entry.value ->> 'title', '')) = ''
  ) then
    raise exception 'Invalid Spotlight feed item';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('tizibane:spotlight-feed-sync'));

  select last_synced_at
    into v_last_synced_at
    from private.spotlight_sync_state
    where singleton = true
    for update;

  if v_last_synced_at is not null and v_last_synced_at > pg_catalog.now() - interval '10 minutes' then
    return 0;
  end if;

  update private.spotlight_sync_state
    set last_synced_at = pg_catalog.now()
    where singleton = true;

  select exists(select 1 from private.spotlight_feed_items)
    into v_has_baseline;

  for v_item in
    select value from pg_catalog.jsonb_array_elements(p_items)
  loop
    v_topic_id := v_item ->> 'topic_id';
    v_topic_label := case v_topic_id
      when 'music-reviews' then 'Music Reviews'
      when 'sports-feed' then 'Sports Feed'
      when 'chipata-activities' then 'Chipata Activities'
      when 'zambian-politics' then 'Zambian Politics'
      when 'learn-trading' then 'Learn Online Trading'
    end;
    v_article_url := v_item ->> 'article_url';
    v_title := pg_catalog.left(pg_catalog.btrim(coalesce(v_item ->> 'title', '')), 240);
    v_source := pg_catalog.left(pg_catalog.btrim(coalesce(v_item ->> 'source', 'Online source')), 100);
    v_summary := pg_catalog.left(pg_catalog.btrim(coalesce(v_item ->> 'summary', '')), 900);
    v_published_at := pg_catalog.left(pg_catalog.btrim(coalesce(v_item ->> 'published_at', '')), 100);

    if v_topic_id is null
       or v_topic_id not in ('music-reviews', 'sports-feed', 'chipata-activities', 'zambian-politics', 'learn-trading')
       or v_article_url is null
       or pg_catalog.length(v_article_url) > 1000
       or v_article_url !~ '^https://news[.]google[.]com/rss/articles/'
       or v_title = '' then
      continue;
    end if;

    v_item_key := pg_catalog.encode(extensions.digest(v_article_url, 'sha256'), 'hex');
    v_fingerprint := pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          pg_catalog.jsonb_build_array(v_title, v_source, v_summary, v_published_at)::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );
    v_kind := null;

    select fingerprint
      into v_previous_fingerprint
      from private.spotlight_feed_items
      where item_key = v_item_key
      for update;

    if not found then
      insert into private.spotlight_feed_items (
        item_key, topic_id, article_url, title, source, summary, published_at, fingerprint
      ) values (
        v_item_key, v_topic_id, v_article_url, v_title, v_source, v_summary, v_published_at, v_fingerprint
      );
      if v_has_baseline then
        v_kind := 'spotlight_new';
      end if;
    elsif v_previous_fingerprint is distinct from v_fingerprint then
      update private.spotlight_feed_items
        set topic_id = v_topic_id,
            article_url = v_article_url,
            title = v_title,
            source = v_source,
            summary = v_summary,
            published_at = v_published_at,
            fingerprint = v_fingerprint,
            last_seen_at = pg_catalog.now()
        where item_key = v_item_key;
      v_kind := 'spotlight_updated';
    else
      update private.spotlight_feed_items
        set last_seen_at = pg_catalog.now()
        where item_key = v_item_key;
    end if;

    if v_kind is not null then
      insert into public.notifications (recipient_id, actor_id, kind, subject_id, metadata)
      select
        profile.id,
        null,
        v_kind,
        null,
        pg_catalog.jsonb_build_object(
          'title', v_title,
          'topic', coalesce(v_topic_label, v_topic_id),
          'source', v_source,
          'article_url', v_article_url
        )
      from public.profiles as profile;

      get diagnostics v_inserted = row_count;
      v_total := v_total + v_inserted;
    end if;
  end loop;

  return v_total;
end;
$function$;

revoke all on function public.sync_spotlight_notifications(jsonb) from public, anon;
grant execute on function public.sync_spotlight_notifications(jsonb) to authenticated;

comment on function public.sync_spotlight_notifications(jsonb) is
  'Deduplicates Spotlight RSS story changes and fans out in-app notifications to every registered profile. The first run seeds a quiet baseline.';
