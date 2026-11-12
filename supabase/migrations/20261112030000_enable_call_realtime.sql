-- Enable private conversation channels to receive call lifecycle updates.
-- Existing RLS policies on call_sessions/call_participants remain the row-level gate.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'call_sessions'
  ) then
    alter publication supabase_realtime add table public.call_sessions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'call_participants'
  ) then
    alter publication supabase_realtime add table public.call_participants;
  end if;
end
$$;
