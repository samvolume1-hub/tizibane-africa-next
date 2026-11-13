create or replace function public.claim_spotlight_email_batch(p_limit integer, p_token text)
returns table(id uuid, recipient_email text, kind text, metadata jsonb, attempts integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_expected text;
begin
  select decrypted_secret into v_expected
  from vault.decrypted_secrets
  where name = 'tizibane_spotlight_cron_token'
  limit 1;

  if v_expected is null or p_token is null or v_expected <> p_token then
    raise exception 'Worker authorization required' using errcode = '42501';
  end if;

  update private.spotlight_email_queue
  set status = 'failed',
      last_error = 'Delivery worker stopped after the final retry',
      updated_at = now()
  where status = 'processing'
    and attempts >= 8
    and claimed_at < now() - interval '15 minutes';

  return query
  with candidates as (
    select q.id
    from private.spotlight_email_queue q
    where q.attempts < 8
      and (
        q.status = 'pending'
        or (q.status = 'processing' and q.claimed_at < now() - interval '15 minutes')
      )
    order by q.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 30), 1), 50)
  )
  update private.spotlight_email_queue q
  set status = 'processing',
      attempts = q.attempts + 1,
      claimed_at = now(),
      updated_at = now()
  from candidates c
  where q.id = c.id
  returning q.id, q.recipient_email, q.kind, q.metadata, q.attempts;
end;
$function$;

create or replace function public.complete_spotlight_email(p_id uuid, p_sent boolean, p_error text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_expected text;
begin
  select decrypted_secret into v_expected
  from vault.decrypted_secrets
  where name = 'tizibane_spotlight_cron_token'
  limit 1;

  if v_expected is null or p_token is null or v_expected <> p_token then
    raise exception 'Worker authorization required' using errcode = '42501';
  end if;

  update private.spotlight_email_queue
  set status = case
        when p_sent then 'sent'
        when attempts >= 8 then 'failed'
        else 'pending'
      end,
      sent_at = case when p_sent then now() else sent_at end,
      last_error = case when p_sent then null else left(coalesce(p_error, 'Delivery failed'), 500) end,
      updated_at = now()
  where id = p_id
    and status = 'processing';

  return found;
end;
$function$;

revoke all on function public.claim_spotlight_email_batch(integer, text) from public;
revoke all on function public.complete_spotlight_email(uuid, boolean, text, text) from public;
grant execute on function public.claim_spotlight_email_batch(integer, text) to anon, authenticated, service_role;
grant execute on function public.complete_spotlight_email(uuid, boolean, text, text) to anon, authenticated, service_role;
