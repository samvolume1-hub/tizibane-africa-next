-- Secure real-time private messaging, read state, and inbox notifications.
alter table public.conversation_members
  add column if not exists last_read_at timestamptz;

create index if not exists messages_conversation_created_sender_idx
  on public.messages (conversation_id, created_at desc, sender_id);

drop policy if exists conversation_member_update_read_state on public.conversation_members;
create policy conversation_member_update_read_state
  on public.conversation_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke update on public.conversation_members from authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;

drop policy if exists message_create on public.messages;
create policy message_create
  on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.is_conversation_member(conversation_id, (select auth.uid()))
    and not exists (
      select 1
      from public.conversations c
      join public.conversation_members other_member
        on other_member.conversation_id = c.id
       and other_member.user_id <> (select auth.uid())
      where c.id = messages.conversation_id
        and not c.is_group
        and private.is_blocked_between((select auth.uid()), other_member.user_id)
    )
  );

create or replace view public.conversation_unread_counts
with (security_invoker = true)
as
select
  cm.conversation_id,
  count(m.id)::integer as unread_count
from public.conversation_members cm
left join public.messages m
  on m.conversation_id = cm.conversation_id
 and m.sender_id <> cm.user_id
 and m.created_at > coalesce(cm.last_read_at, 'epoch'::timestamptz)
where cm.user_id = (select auth.uid())
group by cm.conversation_id;
grant select on public.conversation_unread_counts to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_members'
  ) then
    alter publication supabase_realtime add table public.conversation_members;
  end if;
end
$$;

drop policy if exists "Messaging members can receive private realtime events" on realtime.messages;
create policy "Messaging members can receive private realtime events"
  on realtime.messages
  for select to authenticated
  using (
    case
      when realtime.topic() ~ '^conversation:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then private.is_conversation_member(
          (regexp_match(realtime.topic(), '^conversation:([0-9a-fA-F-]{36})$'))[1]::uuid,
          (select auth.uid())
        )
      when realtime.topic() ~ '^inbox:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then (regexp_match(realtime.topic(), '^inbox:([0-9a-fA-F-]{36})$'))[1]::uuid = (select auth.uid())
      else false
    end
  );

drop policy if exists "Messaging members can send private realtime events" on realtime.messages;
create policy "Messaging members can send private realtime events"
  on realtime.messages
  for insert to authenticated
  with check (
    case
      when realtime.topic() ~ '^conversation:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then private.is_conversation_member(
          (regexp_match(realtime.topic(), '^conversation:([0-9a-fA-F-]{36})$'))[1]::uuid,
          (select auth.uid())
        )
      when realtime.topic() ~ '^inbox:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then (regexp_match(realtime.topic(), '^inbox:([0-9a-fA-F-]{36})$'))[1]::uuid = (select auth.uid())
      else false
    end
  );

create or replace function public.broadcast_message_to_inboxes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  recipient record;
begin
  for recipient in
    select cm.user_id
    from public.conversation_members cm
    where cm.conversation_id = new.conversation_id
      and cm.user_id <> new.sender_id
  loop
    perform realtime.send(
      jsonb_build_object(
        'conversation_id', new.conversation_id,
        'message_id', new.id,
        'sender_id', new.sender_id,
        'created_at', new.created_at
      ),
      'message',
      'inbox:' || recipient.user_id::text,
      true
    );
  end loop;
  return new;
end;
$function$;

revoke all on function public.broadcast_message_to_inboxes() from public, anon, authenticated;
drop trigger if exists broadcast_message_to_inboxes on public.messages;
create trigger broadcast_message_to_inboxes
  after insert on public.messages
  for each row execute function public.broadcast_message_to_inboxes();
