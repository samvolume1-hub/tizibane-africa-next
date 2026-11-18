# TIZIBANE Premium Navigation — Architecture Audit

**Date:** 18 November 2026  
**Repository:** `samvolume1-hub/tizibane-africa-next`  
**Baseline:** `main` at `10a6cc128582c23ce4d509086a202f6fe898ebfc`  
**Working branch:** `recovery/premium-navigation-architecture`  
**Scope:** Read-only source archaeology and navigation architecture mapping. No application code changed in this audit.

## Executive finding

The navigation is not controlled by one coherent stylesheet. It is currently assembled from a component plus several large, overlapping global stylesheets, with late overrides that materially change earlier layout decisions. The current implementation therefore has accumulated CSS debt and should be rationalised before a visual rebuild.

## Verified source inventory

| File | Approx. size | Lines | `!important` declarations | Media queries |
|---|---:|---:|---:|---:|
| `src/app/globals.css` | 324,304 bytes | 8,689 | 1,924 | 146 |
| `src/app/illustrated-navigation-fix.css` | 75,593 bytes | 1,966 | 1,198 | 23 |
| `src/app/navigation-labels.css` | 25,064 bytes | 394 | 436 | 5 |
| `src/app/theme.css` | 29,348 bytes | 619 | 240 | 1 |

These counts are source inventory indicators, not a claim that every declaration is harmful. The three navigation/theme files alone contain 1,874 `!important` declarations. The global stylesheet contains many unrelated feature styles and must not be wholesale replaced as part of navigation work.

## Confirmed architectural findings

### 1. CSS import cascade is split across layout boundaries

- `src/app/layout.tsx` imports `globals.css`, `auth-readability.css`, `theme.css`, `app-polish.css`, and `calling.css`.
- `src/app/home/layout.tsx` separately imports `illustrated-navigation-fix.css` and then `navigation-labels.css`.
- The latter file is therefore loaded after the former within the authenticated home layout and overrides some of its geometry and presentation.
- This split ownership makes the effective navigation style difficult to reason about from any one file.

### 2. Navigation geometry is repeatedly overridden

- The illustrated-navigation stylesheet starts with a 54px rail and contains later layout declarations using 64px, 60px, 45px and 42px grid columns, alongside multiple responsive overrides.
- The navigation-labels stylesheet changes the rail to 166px and changes link geometry and labels again.
- These are not merely theme colour differences; they are competing layout systems layered on the same selectors.

### 3. The current component divides destinations across multiple controls

- `CommunityNavigation` defines 14 destinations.
- Its primary sidebar filters out People, Blocked, Community activity, Events and Premium advertising.
- `AppPageControls` then exposes a People hub, featured links, pin/auto-hide behaviour, Back/Top controls, and separate logout confirmation.
- Messages appears in the primary navigation and again in the People hub. Spotlight appears in the primary navigation and in featured controls.
- This duplication and the auto-hiding/pinning interaction are part of the current UI architecture, not simply decorative CSS. Destination mapping and interaction semantics must be deliberately preserved or rationalised.

### 4. Current CSS conflicts with the newly approved design direction

- `navigation-labels.css` assigns a different accent to individual destinations and applies a 3px left border to each navigation item; responsive rules also apply individual top-border accents.
- This directly conflicts with the requested unified icon containers, restrained active state and removal of individual coloured stripes.
- The illustrated stylesheet hides `.mobile-bottom-nav`, while the theme stylesheet still contains styling for the legacy mobile bottom navigation and More menu. The current `CommunityNavigation` component does not render that bottom-navigation markup.
- Therefore, a proper mobile bottom navigation requires a considered component change and route mapping, not just CSS repainting.

### 5. Theme architecture has legacy selectors and broad override pressure

- `theme.css` contains substantial dark-theme overrides and still targets both current illustrated navigation and older `.side-nav`, `.mobile-bottom-nav`, and `.mobile-more-panel` structures.
- The root layout sets `data-theme` before hydration using local storage. That behaviour is outside the navigation redesign and must remain intact.
- The navigation work must avoid changing global theme bootstrapping or broad content contrast rules.

## Component and behaviour constraints

The following current behaviours were observed in source and must be considered before changing the component:

- Active destination is passed into `CommunityNavigation` by each page and reflected with `active` and `aria-current="page"`.
- Destination links use Next.js `Link`.
- People hub opens and closes client-side and closes after a destination is selected.
- The side controls auto-hide after a delay, can be pinned, and include Back/Top navigation.
- Logout uses a confirmation step and the existing `signOut` server action.
- Notification bell and push-notification onboarding are mounted in the authenticated home layout and must remain independent of navigation rendering.

## Safe implementation strategy

1. Treat `main` as immutable during this task. Work only on `recovery/premium-navigation-architecture`.
2. Keep the current navigation component and CSS as a reference while mapping all route destinations and page usage.
3. Establish a single component ownership model for primary desktop navigation, secondary destinations, mobile bottom navigation and the additional-destinations menu.
4. Introduce narrowly scoped navigation tokens and styles; do not add new global overrides to `globals.css`.
5. Remove legacy selectors only after confirming no live component depends on them. Do not delete the old navigation styles until the replacement has passed route, theme and responsive checks.
6. Preserve the theme boot script, notification features, logout server action, route permissions, and all destination URLs.
7. Verify TypeScript, lint if configured, production build, automated tests, and real browser layouts at desktop/tablet/mobile widths in both themes. Report unavailable checks honestly.

## Explicit non-goals

- No database, Supabase, authentication, member-data, hosting, environment-variable or deployment changes.
- No merge to `main`.
- No broad rewrite or cleanup of unrelated feature styles.
- No deletion of old navigation CSS before dependency and visual verification.

## Current status

**Phase 1 — initial source inventory: complete.**  
**Full route/active-state map: complete.**  
**Navigation reconstruction: implemented on the recovery branch; responsive/theme visual verification remains outstanding.**  
**Automated verification: passed on commit `2efb859`.**  
**Production changes: none.**


## Phase 2 — implementation record (18 November 2026)

### Route ownership map

**Primary desktop navigation and five-item mobile bar:**
- Home — `/home`
- My profile — `/home/profile`
- People — `/home/people`
- Messages — `/home/messages`
- Groups — `/home/groups`
- Stories — `/home/stories`
- Notifications — `/home/notifications`

**Secondary destinations (desktop right rail; tablet/mobile More panel):**
- Spotlight — `/home/connect`
- Announcements — `/home/announcements`
- Community activity — `/home/activity`
- Events — `/home/events`
- Premium advertising — `/home/premium`
- Blocked — `/home/blocked`
- Settings — `/home/settings`

The route audit inspected every authenticated page using `CommunityNavigation`. All 14 destination keys have a corresponding route and active-state key, including the announcement-management page, group detail pages, member profiles and Premium admin page. The mobile bar intentionally promotes Home, People, Messages, Alerts and Profile, with the other destinations available from More.

### Implementation decisions

- Added `community-navigation.module.css` as the new scoped navigation style owner, with shared sizing/spacing and light/dark theme tokens. The CSS module scopes its tokens to the authenticated app layout instead of using global root selectors.
- Added `navigation-items.ts` as the single source of truth for all primary, secondary and mobile destination lists, plus a shared local SVG icon component. No new dependency or external icon asset was introduced.
- Rebuilt `CommunityNavigation` and `AppPageControls` to provide a labelled desktop sidebar, a low-chrome text-labelled secondary rail, a tablet More menu, and a safe-area-aware mobile bottom bar with a separate More panel.
- Preserved all destination URLs, active route states, Back/Top controls, sign-out confirmation and the existing `signOut` server action. Mobile sign-out also retains explicit confirmation.
- Removed the two legacy navigation stylesheet imports from `src/app/home/layout.tsx`. The old stylesheets remain in the repository as reference and have not been deleted.
- Removed 11 obsolete `.app-layout` grid-track declarations and one legacy zero-bottom-padding override from `globals.css` so the new navigation module owns the authenticated app-shell grid and mobile safe-area spacing. No feed, page-content, theme bootstrap, notification or data-access styles were intentionally rewritten.

### Verification boundary

- TypeScript, moderation tests, auth tests and Deno checks passed in CI on commit `b7da5a13030d446f68897be940927b43838fb9ce`; the production build also passed on that commit: [GitHub Actions run 44301193716](https://github.com/samvolume1-hub/tizibane-africa-next/actions/runs/44301193716).
- Added `tests/navigation-routes.test.mjs` and a `test:navigation` CI step to enforce unique destinations, real route files, the five-item mobile set and valid page active keys. The production CI run on commit `2efb859b63acf6748d08401288c963093ee2dd0e` passed TypeScript, moderation, auth, navigation contract tests, Deno checks and the Next.js production build: [GitHub Actions run 44302164990](https://github.com/samvolume1-hub/tizibane-africa-next/actions/runs/44302164990).
- No real browser screenshot, authenticated interaction test, or desktop/tablet/mobile light/dark viewport test has been performed. These remain release gates; a passing build does not establish visual correctness.
