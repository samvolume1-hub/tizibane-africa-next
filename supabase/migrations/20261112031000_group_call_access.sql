-- Permit active members of a private group to receive that group's call updates.
-- Direct conversations continue to use their existing conversation-membership checks.
drop policy if exists call_read on public.call_sessions;
create policy call_read
  on public.call_sessions
  for select to authenticated
  using (
    private.is_conversation_member(conversation_id)
    or exists (
      select 1
      from public.conversations c
      where c.id = call_sessions.conversation_id
        and c.group_id is not null
        and private.is_group_member(c.group_id)
    )
  );

drop policy if exists call_participant_read on public.call_participants;
create policy call_participant_read
  on public.call_participants
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_conversation_member(conversation_id)
    or exists (
      select 1
      from public.conversations c
      where c.id = call_participants.conversation_id
        and c.group_id is not null
        and private.is_group_member(c.group_id)
    )
  );

drop policy if exists "Messaging members can receive private realtime events" on realtime.messages;
create policy "Messaging members can receive private realtime events"
  on realtime.messages
  for select to authenticated
  using (
    case
      when realtime.topic() ~ '^conversation:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then (
          private.is_conversation_member(
            (regexp_match(realtime.topic(), '^conversation:([0-9a-fA-F-]{36})$'))[1]::uuid,
            (select auth.uid())
          )
          or exists (
            select 1 from public.conversations c
            where c.id = (regexp_match(realtime.topic(), '^conversation:([0-9a-fA-F-]{36})$'))[1]::uuid
              and c.group_id is not null
              and private.is_group_member(c.group_id)
          )
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
        then (
          private.is_conversation_member(
            (regexp_match(realtime.topic(), '^conversation:([0-9a-fA-F-]{36})$'))[1]::uuid,
            (select auth.uid())
          )
          or exists (
            select 1 from public.conversations c
            where c.id = (regexp_match(realtime.topic(), '^conversation:([0-9a-fA-F-]{36})$'))[1]::uuid
              and c.group_id is not null
              and private.is_group_member(c.group_id)
          )
        )
      when realtime.topic() ~ '^inbox:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then (regexp_match(realtime.topic(), '^inbox:([0-9a-fA-F-]{36})$'))[1]::uuid = (select auth.uid())
      else false
    end
  );
