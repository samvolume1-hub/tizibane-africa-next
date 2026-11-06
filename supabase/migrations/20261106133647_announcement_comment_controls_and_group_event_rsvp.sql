-- Add author controls to comments on official announcements.
-- Platform admins retain their separate moderation deletion permission.
drop policy if exists announcement_comments_update_own on public.announcement_comments;
create policy announcement_comments_update_own
on public.announcement_comments
for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create or replace function public.prevent_announcement_comment_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.author_id is distinct from old.author_id
    or new.announcement_id is distinct from old.announcement_id then
    raise exception 'Comment ownership and announcement placement cannot be changed';
  end if;
  return new;
end;
$function$;

drop trigger if exists announcement_comments_owner_parent_immutable on public.announcement_comments;
create trigger announcement_comments_owner_parent_immutable
before update on public.announcement_comments
for each row execute function public.prevent_announcement_comment_reassignment();

revoke all on function public.prevent_announcement_comment_reassignment() from public, anon, authenticated;

-- Active members may respond to non-public events associated with their group.
drop policy if exists attendance_create on public.event_attendance;
create policy attendance_create
on public.event_attendance
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.events e
    where e.id = event_attendance.event_id
      and (
        e.is_public
        or (e.group_id is not null and private.is_group_member(e.group_id))
      )
  )
);
