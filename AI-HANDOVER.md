# TIZIBANE Africa — AI Project Handover

This file is the shared handover point for people and AI assistants working on TIZIBANE Africa.

## Project identity

- Product: TIZIBANE Africa
- Purpose: A home for Zambian communities, friendships and meaningful conversations.
- Repository: https://github.com/samvolume1-hub/tizibane-africa-next
- Production site: https://tizibane-africa-next.onrender.com
- Default branch: `main`
- Hosting: Render
- Backend: Supabase
- Supabase project: TIZIBANE Africa (project ID is documented in the owner's private project records; do not publish credentials here).

## Collaboration roles

- **Comet:** research, reference gathering and browser exploration; report findings with source links and clear recommendations.
- **ChatGPT:** project architecture, implementation planning, code changes, review, debugging and handover notes.
- **GitHub:** shared source of truth for code, decisions, task status and handovers.

Each assistant must work from the latest repository state and read this file before making project changes. Do not assume one assistant can see the other's chat history, browser tabs, local files or credentials. Share findings through repository documents, issues or pull requests.

## Non-negotiable working rules

1. **Protect production.** Do not merge, deploy, change environment variables, or modify Supabase settings without explicit approval for that specific action.
2. **Small, scoped changes.** Change only the files needed for the task. Do not redesign or refactor unrelated areas.
3. **Inspect before editing.** Read the current implementation and check recent commits before proposing a change.
4. **Preserve working features.** Do not remove existing functionality to simplify a design.
5. **Responsive by default.** Check desktop, tablet and mobile layouts, including narrow screens and rotation where relevant.
6. **No secrets in Git.** Never commit API keys, passwords, tokens, private URLs or production environment values. Use environment variables and keep `.env` files out of version control.
7. **Verify before handover.** Run the available checks, report exactly what passed or failed, and distinguish tested results from assumptions.
8. **Use branches and pull requests.** Make work on a task branch, explain the exact scope, and request review before merging.
9. **No unapproved cost or infrastructure changes.** Prefer lightweight solutions and existing services. Ask before introducing paid services, storage-heavy features or new infrastructure.
10. **Communicate clearly.** Every handover should state what changed, files touched, tests run, outstanding risks and the next action needed.

## TIZIBANE product constraints and direction

- Audience and launch focus: Zambian communities.
- Design direction: premium, elegant and easy to use; dark purple/black with pink and gold accents, clear white text, and responsive layouts.
- Navigation work must be carefully scoped. The recent recovery restored the established navigation and responsive global styles; do not reintroduce the failed layout experiment.
- Avoid music uploads and video stories because of storage and free-tier constraints.
- Voice/video calling is a desired feature; any future calling implementation must use a protected Jitsi setup, not public rooms.
- Keep Supabase usage and storage efficient.
- Preserve existing authentication, profiles, messages, groups, events and premium advertising functionality unless a task explicitly targets one of them.

## Current recovery checkpoint

The navigation/layout recovery was merged to `main` on 2026-11-07.

- Recovery PR: https://github.com/samvolume1-hub/tizibane-africa-next/pull/1
- Merge commit: `29c7f6fe3476d712afe896c2369c75e2854bd3f1`
- Restored files: `src/components/community-navigation.tsx` and `src/app/globals.css`
- The recovery branch production build passed. The post-merge `main` build/deployment must be checked separately.
- Do not claim the live site is updated until Render confirms deployment and the site is checked on desktop and mobile.

## Required task handover format

For every task, update this document or add a dated note under `docs/handover/` with:

- **Task / date**
- **Goal and agreed scope**
- **Repository branch and starting commit**
- **Files changed**
- **Implementation summary**
- **Checks performed and results**
- **Screens/devices checked**
- **Known issues or risks**
- **Deployment status** (not started / pending / deployed / verified)
- **Next action and who owns it**

## Before starting a new task

1. Read this file and the relevant product/architecture notes.
2. Check the latest `main` commit and open pull requests.
3. Confirm the exact area in scope.
4. Create a task branch from the latest `main`.
5. Implement the smallest safe change and verify it.
6. Open a pull request with a concise summary and test evidence.
7. Wait for explicit approval before merge/deployment.
