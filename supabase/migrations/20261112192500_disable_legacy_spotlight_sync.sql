-- The scheduled Spotlight job is now the sole writer for Spotlight alerts.
-- Keep the old public RPC as a harmless no-op for clients that have not yet
-- received the latest Render deployment, and remove direct access to the
-- legacy private sync function so it cannot create duplicate notifications.
create or replace function public.sync_spotlight_notifications(p_items jsonb)
returns integer
language sql
set search_path = ''
as $function$
  select 0;
$function$;

revoke all on function private.sync_spotlight_notifications(jsonb) from public, anon, authenticated;
revoke all on function public.sync_spotlight_notifications(jsonb) from public, anon;
grant execute on function public.sync_spotlight_notifications(jsonb) to authenticated;
