-- Make group membership management role-aware at the database boundary.
-- Owners appoint moderators; moderators may only approve pending ordinary members.
drop policy if exists member_join_upsert on public.group_members;
drop policy if exists group_member_manager_update on public.group_members;

create policy group_member_manager_update
on public.group_members
for update
to authenticated
using (
  private.is_group_manager(group_id)
  and user_id <> (
    select g.owner_id from public.groups g where g.id = group_members.group_id
  )
  and (
    private.is_group_owner(group_id)
    or (role = 'member' and status = 'pending')
  )
)
with check (
  private.is_group_manager(group_id)
  and user_id <> (
    select g.owner_id from public.groups g where g.id = group_members.group_id
  )
  and (
    (
      private.is_group_owner(group_id)
      and role in ('member', 'moderator')
      and status in ('pending', 'active', 'banned')
    )
    or
    (
      not private.is_group_owner(group_id)
      and role = 'member'
      and status in ('pending', 'active')
    )
  )
);
