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

  update private.spotlight_email_queue as q
  set status = 'failed',
      last_error = 'Delivery worker stopped after the final retry',
      updated_at = now()
  where q.status = 'processing'
    and q.attempts >= 8
    and q.claimed_at < now() - interval '15 minutes';

  return query
  with candidates as (
    select q.id
    from private.spotlight_email_queue as q
    where q.attempts < 8
      and (
        q.status = 'pending'
        or (q.status = 'processing' and q.claimed_at < now() - interval '15 minutes')
      )
    order by q.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 30), 1), 50)
  )
  update private.spotlight_email_queue as q
  set status = 'processing',
      attempts = q.attempts + 1,
      claimed_at = now(),
      updated_at = now()
  from candidates as c
  where q.id = c.id
  returning q.id, q.recipient_email, q.kind, q.metadata, q.attempts;
end;
$function$;
