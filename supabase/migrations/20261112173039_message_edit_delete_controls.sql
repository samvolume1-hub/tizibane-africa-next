-- Allow members to edit and delete only messages they authored.
-- Keep the original sender, conversation, and creation timestamp immutable.

alter table public.messages
  add column if not exists edited_at timestamptz;

revoke update on public.messages from authenticated;
revoke update (id, conversation_id, sender_id, body, created_at) on public.messages from authenticated;
grant update (body) on public.messages to authenticated;
grant delete on public.messages to authenticated;

drop policy if exists message_update_own on public.messages;
create policy message_update_own
  on public.messages
  for update to authenticated
  using (
    sender_id = (select auth.uid())
    and private.is_conversation_member(conversation_id, (select auth.uid()))
  )
  with check (
    sender_id = (select auth.uid())
    and private.is_conversation_member(conversation_id, (select auth.uid()))
  );

drop policy if exists message_delete_own on public.messages;
create policy message_delete_own
  on public.messages
  for delete to authenticated
  using (
    sender_id = (select auth.uid())
    and private.is_conversation_member(conversation_id, (select auth.uid()))
  );

create or replace function private.set_message_edited_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.body is distinct from old.body then
    new.edited_at := pg_catalog.now();
  end if;
  return new;
end;
$function$;

revoke all on function private.set_message_edited_at() from public, anon, authenticated;
drop trigger if exists set_message_edited_at on public.messages;
create trigger set_message_edited_at
  before update of body on public.messages
  for each row execute function private.set_message_edited_at();


-- Notify the two members of the private conversation when an authored message is deleted.
-- The private topic's existing Realtime RLS policy limits delivery to conversation members.
create or replace function public.broadcast_deleted_message_to_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform realtime.send(
    jsonb_build_object('message_id', old.id),
    'message_deleted',
    'conversation:' || old.conversation_id::text,
    true
  );
  return old;
end;
$function$;

revoke all on function public.broadcast_deleted_message_to_conversation() from public, anon, authenticated;
drop trigger if exists broadcast_deleted_message_to_conversation on public.messages;
create trigger broadcast_deleted_message_to_conversation
  after delete on public.messages
  for each row execute function public.broadcast_deleted_message_to_conversation();
