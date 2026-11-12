-- Permit active members and the group owner to use the group's private call channel.
-- Group owners are not stored in group_members by the existing group-creation flow.
create policy group_owner_create_call_conversation
  on public.conversations
  for insert to authenticated
  with check (
    is_group
    and group_id is not null
    and exists (
      select 1 from public.groups g
      where g.id = conversations.group_id
        and g.owner_id = (select auth.uid())
    )
  );

create policy group_owner_add_self_to_call_conversation
  on public.conversation_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.conversations c
      join public.groups g on g.id = c.group_id
      where c.id = conversation_members.conversation_id
        and c.is_group
        and g.owner_id = (select auth.uid())
    )
  );

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
        and (
          private.is_group_member(c.group_id)
          or exists (select 1 from public.groups g where g.id = c.group_id and g.owner_id = (select auth.uid()))
        )
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
              and (
                private.is_group_member(c.group_id)
                or exists (select 1 from public.groups g where g.id = c.group_id and g.owner_id = (select auth.uid()))
              )
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
