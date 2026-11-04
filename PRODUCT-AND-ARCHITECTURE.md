# TIZIBANE Africa — Product and Architecture Contract

## Purpose
Build a dependable, complete community platform from a clean application architecture. The current app remains untouched as a reference and fallback.

## Launch scope

### Identity and accounts
- Registration, sign-in, sign-out, email verification, password reset, session restoration.
- Member profile: display name, unique handle, avatar, bio, location (optional), privacy controls.
- Account safety: block, report, deactivate/delete account, session management.

### Community
- Home feed with text and photo posts.
- Comments and reactions.
- Photo-only ephemeral stories with expiry and view tracking.
- Member discovery, follows, friend/connection requests, accepted connections.
- Groups with public/private visibility, membership, roles, rules, and group feed.
- Events with details, RSVP/attendance, and organizer controls.
- Notifications for meaningful account and community activity.

### Messaging and live calls
- One-to-one and group text messaging.
- Live one-to-one audio calls.
- Live group audio calls.
- Live one-to-one video calls.
- Live group video calls.
- Calls must never be recorded, stored, or transcribed. No call media is written to Supabase Storage.
- Call permissions and membership are verified server-side. Add clear ringing, joining, reconnecting, busy, declined, ended, and failed states.

### Safety and administration
- User reporting, moderator queue, audit trail, block/mute controls, rate limits, spam protection.
- Server-managed roles only; never trust browser-editable profile metadata for privileges.
- Admin tools separated from ordinary member screens.

### Business model (later launch phase unless existing verified requirements demand otherwise)
- Premium plans and advertising only after pricing, provider, legal, and webhook requirements are verified.
- No fake payment success or client-only entitlements.

## Explicit exclusions
- Music uploads, streaming, or libraries.
- Video uploads, recorded video posts, video stories, or hosted video media.
- Any call recording, call transcription, or persistent call media.
- Features that pretend local browser data is shared cloud data.

## Data and media rules
- Audit existing Supabase tables and policies before deciding what to reuse.
- Preserve existing user IDs and records if/when real data exists; do not migrate blindly.
- Use additive, reversible schema changes wherever possible.
- Private photo bucket; validate MIME type and file size; resize/compress on device; generate thumbnails; avoid duplicate originals; enforce per-user quotas and cleanup of expired story photos.
- Store object paths, not public media URLs, in relational records. Use short-lived signed URLs for private media.
- No service-role key in client bundles, public env vars, or user-facing instructions.
- Confirm storage region, backups, retention, recovery, and Zambia data-protection obligations before public launch.

## Architecture principles
- Clear feature modules: auth, profiles, feed, stories, connections, groups, events, messaging, calls, notifications, moderation, settings.
- Typed data contracts and centralized API/data-access layer; UI components do not issue ad-hoc database queries.
- Server-side authorization for privileged operations; RLS as a second enforcement layer.
- Realtime only for experiences that need it; bounded polling/backoff for fallback and reconnect.
- Loading, empty, offline, error, permission-denied, and success states designed for every core workflow.
- Accessible keyboard/touch interactions and mobile-first layouts.
- Low-bandwidth mode and responsive image delivery.
- Observability without logging secrets or private message/media content.

## Acceptance criteria
- A member can register on one device, sign in on another, and see the same permitted cloud data.
- Two independent accounts can verify privacy and authorization boundaries for profiles, posts, stories, groups, messages, and calls.
- No client-side-only feature is presented as successfully saved or sent.
- Every upload is validated, compressed, permission-checked, and retrievable only by authorized users.
- Live calls work in all four required modes and have no recording/storage path.
- Moderation actions are role-checked and auditable.
- Core flows pass automated tests and real-device staging checks before cutover.
