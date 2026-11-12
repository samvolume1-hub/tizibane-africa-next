# TIZIBANE email delivery (Brevo HTTPS API)

This integration adds email as a separate delivery channel for new and updated Spotlight notifications. Existing in-app notifications remain unchanged.

## Why the HTTPS API is used

TIZIBANE runs on Render's free web service. Render blocks outbound SMTP traffic on ports 25, 465, and 587 for free web services. The application therefore sends through Brevo's transactional email API over HTTPS (port 443), not through SMTP. The SMTP key is not used by this integration.

## Brevo setup

1. Verify a sender in Brevo → Settings → Senders, Domains, IPs → Senders.
2. In Brevo's SMTP & API settings, open the API keys section and create an API key. This must be an API key, not the SMTP key.
3. Keep the API key private.

## Supabase Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets, set:

- `BREVO_API_KEY` — the Brevo API key
- `BREVO_SENDER_EMAIL` — the verified sender email address
- `BREVO_SENDER_NAME=TIZIBANE Zambia`

These values are read only by the scheduled Edge Function. They are not placed in the browser, Render environment, or source control.

## Delivery behaviour

- A private database trigger queues email copies only when a new `spotlight_new` or `spotlight_updated` notification is inserted for a user with a confirmed email address.
- The existing in-app notification insert and delivery path is not changed.
- The scheduled Spotlight Edge Function claims a small batch and sends through Brevo's HTTPS API.
- Successful sends are marked sent. Failed sends are retried on later scheduled runs, with a maximum of eight attempts.
- If Brevo secrets are not configured, the queue remains pending and in-app notifications continue normally.
- The initial baseline does not generate old Spotlight email notifications. Only future inserted Spotlight notifications are queued.

## Enablement checklist

1. Verify a sender in Brevo.
2. Create a Brevo API key (the SMTP key cannot authenticate to the HTTP API).
3. Add the API key, verified sender email, and sender name to Supabase Edge Function secrets.
4. Apply the queue migration and deploy the updated Edge Function.
5. Send a controlled test before relying on member-wide delivery.
