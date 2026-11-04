# TIZIBANE Africa — Clean Rebuild

The new application lives in this folder. The legacy application at the repository root is preserved as a reference and fallback.

## Run locally
1. Install Node.js 20 or newer.
2. Copy .env.example to .env.local.
3. Add the existing Supabase project URL and publishable/anon key. Never use a service-role key in browser variables.
4. From this folder run npm install, then npm run dev.
5. Open http://localhost:3000.

## Built and validated
- Responsive landing page and dark, gold and emerald visual identity.
- Supabase SSR clients and session-refresh middleware.
- Real email/password registration and sign-in server actions.
- Protected member home route and sign-out.
- Live shared text feed using the existing posts and profiles tables.
- Server-authorized text post creation with public, friends or private audience selection.
- Member profile editing with unique handles, biography, location and visibility settings.
- Private profile-photo uploads and signed media delivery.
- Shared photo posts with server-validated JPG, PNG and WebP uploads.
- Database-backed reactions and comments.
- Member directory with profile-visibility-aware search, friend requests, accept/decline, request cancellation, friendship removal and follow/unfollow controls.
- Text-only private messaging between accepted friends, with protected conversation membership and message delivery.
- Database-generated notifications for friend requests and responses, messages, comments, reactions, follows, group join requests and event attendance; members can mark notifications read.
- Group creation, public joining, private join requests, owner/moderator approvals and member leave controls.
- Private group feeds with member-only posts, photo sharing, comments, reactions and post-owner deletion.
- Community event creation, timezone-aware scheduling and RSVP responses.
- Upload limits match the existing private community-photos bucket (8 MiB).
- Automated GitHub Actions typecheck and production build run on rebuild-branch pushes.
- No fake posts, sample users or local-only success states.

## Security work completed
- Profile visibility is enforced at the database row-policy layer, not just hidden in the UI.
- Authorization helper functions are kept in a non-exposed private schema; public RPC execution is revoked.
- RLS policies use statement-level auth identity caching and overlapping access policies have been consolidated.
- Foreign-key lookup indexes have been added after the database performance review.
- Aggregate views use invoker security so they respect the requesting user's RLS policies.
- The group-manager helper is no longer executable by anonymous/public roles.
- Trigger-only profile/group bootstrap functions are no longer callable as RPC endpoints.
- Direct-message membership policy now explicitly correlates the existing participant check to the outer conversation row.
- Premium entitlement records remain inaccessible to anon/authenticated clients and are reserved for service-role operations.

## Next feature gates
Live audio/video → advanced moderation and abuse review → complete security, privacy and multi-device testing → production launch.

This branch is not deployed. Production public cutover requires a separate review and explicit approval.
