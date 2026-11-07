# TIZIBANE Africa — Repository Inspection Handover

**Prepared:** 7 November 2026  
**Purpose:** Give another ChatGPT session/assistant a durable record of the repository inspection and the working boundaries.  
**Inspection mode:** Read-only. No files, branches, commits, pull requests, settings, or deployments were changed by the inspecting assistant.

> **Important verification note:** This report records what was visible during the inspection. GitHub web pages can change, and some pages did not load independently. Treat claims marked as unverified or qualified below accordingly. Re-check live GitHub state before relying on time-sensitive details.

## 1. Repository identity and access

The repository inspected was:

- GitHub account/owner: `samvolume1-hub`
- Repository: `tizibane-africa-next`
- URL: https://github.com/samvolume1-hub/tizibane-africa-next
- Default branch reported: `main`

This is the new TIZIBANE Africa Next repository. Do not confuse it with the legacy repository:

- Legacy repository: `samvolume1-hub/tizibane-africa`
- URL: https://github.com/samvolume1-hub/tizibane-africa

**Protection rule:** The legacy `tizibane-africa` repository must remain untouched. Do not edit it, commit to it, open PRs against it, configure it, or deploy it.

The new repository README describes the project as a clean rebuild and says the legacy application is preserved separately as a reference/fallback. The inspecting assistant could distinguish the two repository identities. It could not independently verify the old repository's current contents or permissions because the old repository page returned 404 during that inspection.

## 2. AI-HANDOVER.md and collaborator roles

The file `AI-HANDOVER.md` was not found on the `main` branch at:

https://github.com/samvolume1-hub/tizibane-africa-next/blob/main/AI-HANDOVER.md

That URL returned 404 during inspection.

However, the inspecting assistant located and read `AI-HANDOVER.md` in the proposed changes for PR #2:

https://github.com/samvolume1-hub/tizibane-africa-next/pull/2/files

The document was reported as 80 lines. It is part of the PR proposal and must not be treated as already merged or as an active file on `main`.

The responsibilities described were:

| Collaborator/system | Role |
|---|---|
| **Comet** | Research, reference gathering, browser exploration, source links, and recommendations. |
| **ChatGPT** | Architecture, implementation planning, code changes, review, debugging, and handover notes. |
| **GitHub** | Shared source of truth for code, decisions, task status, and handovers. |

The handover emphasizes that assistants must work from the latest repository state and must not assume access to each other's conversations, browser tabs, local files, or credentials.

## 3. Default branch

The default branch was reported as:

`main`

This was visible on the repository landing page and as the base branch for the pull request inspected.

## 4. Latest main commit observed

The latest merged `main` commit that the inspecting assistant could establish was:

- Commit: `29c7f6fe3476d712afe896c2369c75e2854bd3f1`
- Short SHA: `29c7f6f`
- Title: **Restore stable TIZIBANE layout and responsive navigation**
- Date reported: 7 November 2026
- Commit URL: https://github.com/samvolume1-hub/tizibane-africa-next/commit/29c7f6fe3476d712afe896c2369c75e2854bd3f1

The commit was reported to:
- Restore the established community navigation.
- Restore the last known-good responsive application layout.
- Change `src/components/community-navigation.tsx`.
- Change `src/app/globals.css`.
- Contain 53 additions and 774 deletions.
- Have one successful check reported by its pull request.

**Qualification:** The main-branch commit-history page did not load independently during inspection. This is the latest merged main commit the assistant could establish, not a guarantee that no later direct push occurred. Re-check the live `main` branch before starting work.

## 5. Pull requests observed

The repository was reported as having one open pull request and one closed/merged pull request.

### Open PR #2

- Title: **Add shared AI project library and handover guide**
- URL: https://github.com/samvolume1-hub/tizibane-africa-next/pull/2
- Status: **Open — Draft**
- Source branch: `chore/ai-project-library`
- Target/base branch: `main`
- Commit reported: `424ab02`
- Adds `AI-HANDOVER.md` (80 lines)
- Described as documentation-only
- No reviews were recorded in the inspection

Do not assume PR #2 is approved or merged. Do not merge it without the user's explicit approval.

### PR #1

- Title: **Restore stable TIZIBANE layout and responsive navigation**
- Status: **Merged**
- It corresponds to commit `29c7f6f`.

**Qualification:** PR status is time-sensitive. Re-check GitHub before relying on this list.

## 6. Production website URL recorded in project documentation

The handover document proposed in PR #2 recorded:

https://tizibane-africa-next.onrender.com

Hosting was described as Render, with Supabase as the backend.

**Critical qualification:** This URL being recorded in documentation is not proof that the latest code is deployed there or that the site is currently healthy. The current README was reported to say that this branch is not deployed and that production public cutover requires separate review and explicit approval. Treat the URL as a documented production address only until deployment state is independently verified.

## 7. Rules before changing code or deploying

The inspection extracted the following working rules from the repository documentation and proposed handover. Apply them as safeguards:

1. **Protect production.** Do not merge, deploy, change environment variables, or change Supabase configuration without the user's explicit approval for that specific action.
2. **Make small, scoped changes.** Modify only files necessary for the agreed task.
3. **Inspect first.** Read the current implementation, relevant documentation, recent commits, and open PRs before proposing or making changes.
4. **Preserve existing functionality.** Do not remove working features merely to simplify implementation.
5. **Test responsive behavior.** Check desktop, tablet, mobile, narrow screens, and orientation changes where relevant.
6. **Protect secrets.** Never commit API keys, passwords, tokens, service-role keys, or production environment values.
7. **Verify changes.** Run available tests and report exactly what passed, failed, or could not be run.
8. **Use task branches and PR review.** Work on a branch from the latest `main`; submit a PR for review rather than pushing unreviewed work directly to production/main.
9. **Control costs.** Do not introduce paid services or infrastructure without asking.
10. **Document handovers.** Record files changed, implementation details, tests, risks, deployment status, and next actions.
11. Before a task, read the handover and architecture documentation, check current `main` and open PRs, confirm exact scope, and create a task branch from the latest `main`.
12. After implementation, verify and submit a PR. Wait for the user's explicit approval before merging or deploying.

Additional product and security protections recorded in the inspection:

- Preserve authentication, profiles, messages, groups, events, and premium advertising functionality.
- Avoid music uploads and video stories.
- Keep Supabase usage and storage efficient.
- Never expose Supabase service-role credentials.
- Live calling, if implemented, should use protected Jitsi rather than public rooms.
- Preserve the established visual direction and responsive navigation.

These rules are a summary of the inspected project documentation; consult the actual repository documents for their exact wording and any later updates.

## 8. Repository separation — mandatory boundary

There are two distinct repository names:

**Current project to inspect/work on (only when authorized):**
`https://github.com/samvolume1-hub/tizibane-africa-next`

**Legacy project — do not touch:**
`https://github.com/samvolume1-hub/tizibane-africa`

Never assume the two repositories are interchangeable. Do not use the legacy repository as a target for commits, pull requests, deployment configuration, or cleanup. If a task's repository target is ambiguous, stop and ask the user.

## 9. What the inspecting assistant did and did not do

The user explicitly requested inspection only and prohibited changes, commits, pull requests, and deployments.

The inspecting assistant reported that it:
- Read the new repository's public GitHub pages and available project documentation.
- Read the proposed `AI-HANDOVER.md` in PR #2.
- Examined the visible commit and pull-request information.
- Did not make code or documentation changes.
- Did not create commits or pull requests.
- Did not merge anything.
- Did not deploy anything.
- Did not change Supabase or hosting configuration.
- Did not modify the legacy repository.

## 10. Instructions to the next ChatGPT session

Before doing any project work:

1. Confirm the target is exactly `samvolume1-hub/tizibane-africa-next`.
2. Re-check the current default branch, latest `main` commit, and open PRs.
3. Read the current `AI-HANDOVER.md` if it has since been merged or added; do not rely solely on this report.
4. Read the current README and architecture documentation.
5. Confirm the user's requested scope before editing.
6. Keep `samvolume1-hub/tizibane-africa` completely untouched.
7. Do not merge or deploy without explicit user approval.

**This report is a handover of an earlier inspection, not a substitute for live repository verification.** If any fact here conflicts with the current repository, the live repository state and the user's latest explicit instructions take precedence.
