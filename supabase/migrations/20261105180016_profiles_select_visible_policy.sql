create policy "profile_select_visible"
on public.profiles
for select
to authenticated
using (private.can_view_profile(id));
