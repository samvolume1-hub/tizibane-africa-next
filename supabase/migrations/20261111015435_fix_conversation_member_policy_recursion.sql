-- Prevent recursive RLS evaluation when adding the second member to a new direct conversation.
-- The previous policy queried conversation_members directly from its own INSERT
-- WITH CHECK expression. That query re-entered conversation_members SELECT RLS
-- and raised SQLSTATE 42P17 (infinite recursion detected in policy).

create or replace function private.has_other_conversation_member(
  c uuid,
  u uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select auth.uid() is not null
    and u = auth.uid()
    and exists (
      select 1
      from public.conversation_members existing
      where existing.conversation_id = c
        and existing.user_id <> u
    );
$function$;

revoke all on function private.has_other_conversation_member(uuid, uuid) from public, anon;
grant execute on function private.has_other_conversation_member(uuid, uuid) to authenticated;

drop policy if exists conversation_member_add on public.conversation_members;

create policy conversation_member_add
on public.conversation_members
for insert
to authenticated
with check (
  (
    private.is_conversation_creator(conversation_id)
    and user_id = (select auth.uid())
  )
  or
  (
    private.is_conversation_creator(conversation_id)
    and user_id <> (select auth.uid())
    and not private.is_blocked_between((select auth.uid()), user_id)
    and private.are_friends((select auth.uid()), user_id)
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_members.conversation_id
        and not c.is_group
        and c.group_id is null
    )
    and not private.has_other_conversation_member(conversation_id, (select auth.uid()))
  )
  or
  (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.is_group
        and c.group_id is not null
        and private.is_group_member(c.group_id)
    )
  )
);
