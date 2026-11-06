-- Members of a private group event can see the attendance list for that group event.
-- Only the attendee can change or remove their own RSVP (separate policies).
drop policy if exists attendance_read on public.event_attendance;
create policy attendance_read
on public.event_attendance
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.events e
    where e.id = event_attendance.event_id
      and (
        e.is_public
        or e.organizer_id = (select auth.uid())
        or (
          e.group_id is not null
          and (
            private.is_group_member(e.group_id)
            or private.is_group_manager(e.group_id)
          )
        )
      )
  )
);
