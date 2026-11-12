-- Give call lifecycle subscriptions their own private topic so the Messages
-- thread and CallControls never register handlers on competing channels.
-- Both topic forms remain restricted to actual conversation participants and
-- authorized group members/owners.
drop policy if exists "Messaging members can receive private realtime events" on realtime.messages;
create policy "Messaging members can receive private realtime events"
  on realtime.messages
  for select to authenticated
  using (
    case
      when realtime.topic() ~ '^(conversation|conversation-calls):[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then (
          private.is_conversation_member(
            (regexp_match(realtime.topic(), '^(conversation|conversation-calls):([0-9a-fA-F-]{36})$'))[2]::uuid,
            (select auth.uid())
          )
          or exists (
            select 1 from public.conversations c
            where c.id = (regexp_match(realtime.topic(), '^(conversation|conversation-calls):([0-9a-fA-F-]{36})$'))[2]::uuid
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
      when realtime.topic() ~ '^(conversation|conversation-calls):[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then (
          private.is_conversation_member(
            (regexp_match(realtime.topic(), '^(conversation|conversation-calls):([0-9a-fA-F-]{36})$'))[2]::uuid,
            (select auth.uid())
          )
          or exists (
            select 1 from public.conversations c
            where c.id = (regexp_match(realtime.topic(), '^(conversation|conversation-calls):([0-9a-fA-F-]{36})$'))[2]::uuid
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
