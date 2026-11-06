-- Make group roles explicit: moderators can approve/decline requests and moderate
-- their own group feed, but only the group owner can appoint moderators, ban/remove
-- active members, or manage ownership-level membership state.

create or replace function private.is_group_owner(g uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and exists (select 1 from public.groups x where x.id = g and x.owner_id = auth.uid());
$function$;
grant execute on function private.is_group_owner(uuid) to authenticated;

create or replace function public.enforce_group_member_role_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  group_owner uuid;
begin
  if new.group_id is distinct from old.group_id or new.user_id is distinct from old.user_id then
    raise exception 'A group membership cannot be moved to another group or member';
  end if;

  select owner_id into group_owner from public.groups where id = old.group_id;
  if group_owner is null then
    raise exception 'The group no longer exists';
  end if;

  if auth.uid() = group_owner then
    if new.role = 'owner' and new.user_id <> group_owner then
      raise exception 'Only the group owner record may have the owner role';
    end if;
    if old.user_id = group_owner and new.role <> 'owner' then
      raise exception 'The group owner role cannot be removed here';
    end if;
    return new;
  end if;

  if private.is_group_manager(old.group_id)
    and old.status = 'pending'
    and new.status = 'active'
    and new.role = old.role then
    return new;
  end if;

  raise exception 'Only the group owner can change member roles or active membership status';
end;
$function$;

drop trigger if exists group_member_role_changes_guard on public.group_members;
create trigger group_member_role_changes_guard
before update on public.group_members
for each row execute function public.enforce_group_member_role_changes();
grant execute on function public.enforce_group_member_role_changes() to authenticated;

drop policy if exists member_read on public.group_members;
create policy member_read on public.group_members for select to authenticated
using (user_id = (select auth.uid()) or private.is_group_member(group_id) or private.is_group_manager(group_id));

drop policy if exists member_delete on public.group_members;
create policy member_delete on public.group_members for delete to authenticated
using (
  (user_id = (select auth.uid()) and not private.is_group_owner(group_id))
  or (status = 'pending' and private.is_group_manager(group_id))
  or (status = 'active' and private.is_group_owner(group_id))
);
