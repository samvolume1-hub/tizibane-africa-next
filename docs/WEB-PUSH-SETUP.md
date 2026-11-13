# TIZIBANE web push notifications (no per-message provider)

This implementation uses the standards-based Web Push API, Service Workers and VAPID. It does not require Firebase, a paid SMS gateway, WhatsApp API, or a third-party push subscription. Browser push services deliver the encrypted messages. Hosting, Supabase quotas and internet/data usage still apply; this is not a promise of unlimited free infrastructure.

## Platform support

- Android: current Chrome, Edge and other browsers that implement Push API and Service Workers.
- Desktop: current Chrome, Edge, Firefox and Safari versions with Web Push support.
- iPhone/iPad: iOS/iPadOS 16.4 or later, after the member adds TIZIBANE to the Home Screen and opens it as a web app. The permission request must follow a direct user tap.
- All platforms require HTTPS and explicit member permission.

## One-time VAPID setup

Generate a single VAPID key pair from the repository root using Deno:

```sh
deno run --allow-env supabase/functions/web-push-notification-worker/generate-vapid-keys.ts
```

The script prints:
- `WEB_PUSH_VAPID_PRIVATE_KEY`: the JSON Web Key. Treat it as a secret. Add it only to Supabase Edge Function secrets.
- `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`: the public application-server key. Add it to the Render service environment.

Never commit either key to GitHub. Do not regenerate the key after members have subscribed; rotating it requires members to subscribe again.

## Required environment configuration

1. Supabase Edge Function secret:
   - `WEB_PUSH_VAPID_PRIVATE_KEY` = the full private JWK JSON printed by the script.
2. Render environment variable:
   - `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` = the public base64url key printed by the script.

The push worker also uses the existing Supabase server credentials and the existing internal worker-token Vault entries used by the project's scheduled workers. It does not read, change, or send through Brevo.

## Deployment sequence

1. Review and merge the code changes.
2. Apply `supabase/migrations/20261113090000_web_push_notifications.sql` to the existing Supabase project.
3. Set the two VAPID values above in their respective secret stores.
4. Deploy `web-push-notification-worker` with JWT verification disabled; the function independently validates the existing internal worker token before it claims any queue work.
5. Set the public VAPID key in Render and allow the deployment to finish.
6. Sign in to TIZIBANE, open Notifications, and tap **Enable phone notifications**.
7. Send a real test notification to the opted-in test accounts and verify Android/desktop delivery. Test iPhone separately from an installed Home Screen web app.

## Privacy and delivery behavior

- Subscriptions are per member and per browser/device. Each member opts in on each device.
- Members can switch push off from the Notifications page.
- The database stores the push endpoint and browser encryption keys, protected by row-level security so each member can manage only their own subscriptions.
- The queue excludes all Spotlight notification kinds. Spotlight's existing experience and email pipeline are not changed.
- Push messages contain short activity alerts only. Private message contents are never included.
- Expired subscriptions returning a permanent 404/410 response are removed automatically.
- Temporary delivery failures are retried up to six attempts.
- Push delivery is best-effort. A push service accepting a message does not guarantee that a device displays it; users can also disable notifications at operating-system level.

## Cost guardrails

Web Push does not charge per message like SMS. The implementation uses the existing Supabase project and Render service, with a five-minute queue worker. Keep an eye on existing free-plan quotas. Do not enable a paid plan or add a paid provider for this feature without explicit approval.
