# TIZIBANE Africa — AI Project Handover

**Purpose:** Keep ChatGPT, Comet, and any future contributors aligned while developing the TIZIBANE Africa clean rebuild.

## 1. Repository identity and protected boundary

- **Active clean-rebuild repository:** https://github.com/samvolume1-hub/tizibane-africa-next
- **Expected working branch:** `main` (verify before every task).
- **Legacy repository:** https://github.com/samvolume1-hub/tizibane-africa

The legacy repository is protected. Do not edit it, commit to it, open pull requests against it, change its settings, or deploy from it unless the user gives explicit, separate approval.

Treat the active repository's live GitHub state as authoritative. Before relying on any commit, branch, pull request, deployment, or file status in this document, verify it directly because repository state can change.

## 2. Collaboration roles

### Comet
- Research, reference gathering, browser exploration, and comparison of implementation options.
- Provide source links, evidence, risks, and concise recommendations.
- Do not assume access to ChatGPT conversations, local files, credentials, or private project context.

### ChatGPT
- Architecture and implementation planning.
- Code changes when repository/file access is available and the user has authorized the scope.
- Code review, debugging, test planning, and verification.
- Maintain clear handover notes and report the actual state of work.

### GitHub
GitHub is the shared source of truth for code, accepted decisions, task status, and handovers. Assistants must communicate through repository files and pull requests rather than assuming they can see each other's sessions.

## 3. Required start-of-task checklist

At the beginning of each work session:

1. Confirm the repository is `samvolume1-hub/tizibane-africa-next`.
2. Confirm the current branch and working-tree state.
3. Read this file, `AI-INSPECTION-REPORT.md`, the README, and relevant project documentation.
4. Verify the latest commit on the target branch and inspect relevant open/merged pull requests.
5. Inspect the actual source code before proposing or changing it.
6. Identify the exact task scope, affected files, dependencies, and data/security risks.
7. Check whether another contributor has made changes since the previous handover.
8. If a required file or status cannot be verified, say so rather than guessing.

Do not treat a proposed pull-request file as active on `main` until it has actually been merged.

## 4. Change control and production safety

- Do not merge pull requests, deploy, change hosting configuration, change environment variables/secrets, alter Supabase settings, or run database migrations without the user's explicit approval.
- Use a task branch and pull request for code changes when repository access permits.
- Never expose, copy into documentation, or commit API keys, passwords, access tokens, private URLs, or other secrets.
- Do not delete, reset, overwrite, or migrate existing member data.
- Do not introduce paid infrastructure or services without asking first.
- A documentation update is not permission to merge, deploy, or change production.
- Clearly distinguish completed work from recommendations, unverified assumptions, and blocked work.

## 5. Product and engineering requirements

### Preserve core social functionality
Protect existing and planned account-based functionality, including:
- Authentication and member profiles.
- Friendships and social connections.
- Groups and group membership.
- Social feed and posts.
- Account-based messaging and conversations.
- Notifications and unread indicators.
- Events and other established community features.
- Premium/ad-related features already accepted for the product.

Do not replace real functionality with dummy counts, placeholder interactions, or mock data presented as real member data.

### Visual direction
- Preserve the established premium dark-and-gold styling.
- Keep the original backgrounds and existing colour theme unchanged.
- Retain approved gold details and animations.
- Do not repeat the previously rejected redesign that introduced broad white or bright surface areas across canvases and tabs.
- Preserve the accepted welcome/login illustrations and ring animations unless the user requests a change.

### Responsive experience
- Support phones, tablets, laptops, and large screens.
- Adapt to portrait and landscape rotation.
- Prevent overlapping, clipped, squashed, or hidden tabs, images, controls, and features.
- Keep important navigation and logout access visible and usable.

### Data, media, and performance
- Preserve existing Supabase data and member records.
- Make database changes only with explicit approval and a safe migration/backup plan.
- Keep media responsive and sized appropriately for its display area.
- Use efficient loading, caching, and lazy loading where suitable.
- Respect data-saving preferences and constrained mobile connections.
- Do not install all large scenic/background assets at startup when they can be loaded on demand.
- Keep monitoring claims grounded in measurements; distinguish browser metrics from hosting and database metrics.

### Specific accepted product details
- The community group name is **AMODZI Together**.
- Tagline: “Friends, stories, and a stronger community.”
- Do not use the incorrect spellings AMOOZI or AMOODZI.
- Do not show invented/dummy member counts.
- Keep established message-panel and typing-box behaviour intact.
- The notification bell should be visible and animated without requesting physical phone vibration.
- Do not reintroduce a floating Help & Support button that the user asked to remove.

## 6. Testing and verification

For every code change:
1. Run the relevant automated tests.
2. Run lint/type checks and production build when available.
3. Check affected screens at mobile, tablet, and desktop widths.
4. Check portrait and landscape layouts where relevant.
5. Verify the affected user flows, including loading, empty, error, and signed-in states.
6. Check browser console and network errors where possible.
7. Review the final diff for accidental deletions, unrelated changes, secrets, or data-loss risks.
8. Report exactly what was tested and what could not be tested.

Never claim a test passed unless it was actually run and its result observed.

## 7. Living project report — mandatory after every work session

After every project session, update `AI-INSPECTION-REPORT.md`, including sessions involving research, inspection, planning, code changes, testing, or deployment review.

Each entry must include:
- Date and contributor.
- Repository and branch checked.
- Task and agreed scope.
- Commit/PR references, if any.
- Files inspected or changed.
- Findings and decisions.
- Tests/checks run and their actual results.
- Deployment status, clearly marked verified or unverified.
- Blockers, risks, and next recommended step.
- Confirmation of whether production, hosting, Supabase, or member data was changed.

Append a dated entry; do not silently erase useful history. Do not include secrets or personal member data.

If an assistant does not have GitHub write access, it must prepare the proposed report update for the user and clearly state that it has not been committed. This document does not itself create an automatic GitHub update mechanism.

## 8. Handover and conflict resolution

At the end of a work session:
1. Update the living report or provide the exact proposed entry.
2. List completed work separately from unfinished work.
3. Identify files/commits/PRs involved.
4. State tests and verification results.
5. State the next safe action and any approval required.

When instructions conflict, use this order:
1. The user's latest explicit instruction.
2. User-approved decisions recorded in the active repository.
3. This handover document.
4. Older notes and assumptions.

When uncertain about destructive, production, security, billing, or data-related work, stop and ask the user.
