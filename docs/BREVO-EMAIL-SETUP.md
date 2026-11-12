# TIZIBANE email delivery (Brevo SMTP)

This integration adds email as a separate delivery channel for new and updated Spotlight notifications. Existing in-app notifications remain unchanged.

## Runtime configuration

Set these server-only variables in the Render service for `tizibane-africa-next`:

- `BREVO_SMTP_HOST=smtp-relay.brevo.com`
- `BREVO_SMTP_PORT=587`
- `BREVO_SMTP_LOGIN` — the SMTP login shown in Brevo
- `BREVO_SMTP_KEY` — the SMTP key (not a Brevo API key)
- `BREVO_SENDER_EMAIL` — an email address verified under Brevo Senders
- `BREVO_SENDER_NAME=TIZIBANE Zambia`
- `TIZIBANE_EMAIL_DISPATCH_TOKEN` — a long random secret shared with the Supabase Edge Function

Do not use the SMTP login as the From address. Brevo requires a verified sender address. Never put these values in `NEXT_PUBLIC_*`, source files, commits, or browser code.

## Supabase Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets, set:

- `TIZIBANE_EMAIL_DISPATCH_URL=https://tizibane-africa-next.onrender.com/api/internal/spotlight-email`
- `TIZIBANE_EMAIL_DISPATCH_TOKEN` — exactly the same random secret configured in Render

The shared dispatch token only authorizes the private server-to-server delivery endpoint. The existing Spotlight cron token remains separate.

## Delivery behaviour

- A private database trigger queues email copies only when a new `spotlight_new` or `spotlight_updated` notification is inserted.
- The existing in-app notification insert and delivery path is not changed.
- The scheduled Spotlight Edge Function claims a small batch and asks the Render Node.js route to send it through Brevo SMTP over STARTTLS.
- Successful sends are marked sent. Failed sends are retried on later scheduled runs, with a maximum of eight attempts.
- If email dispatch secrets are not configured, the queue remains pending and in-app notifications continue normally.
- The initial baseline does not generate old Spotlight email notifications. Only future inserted Spotlight notifications are queued.

## Enablement checklist

1. Verify a sender in Brevo → Settings → Senders, Domains, IPs → Senders.
2. Configure the Render variables above, keeping the SMTP key private.
3. Configure the two Supabase Edge Function secrets.
4. Apply the queue migration and deploy the updated Edge Function.
5. Send a controlled test before relying on member-wide delivery.
