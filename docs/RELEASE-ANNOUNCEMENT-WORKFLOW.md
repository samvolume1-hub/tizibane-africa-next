# TIZIBANE production release announcements

Use the official announcement manager at `/home/announcements/manage` for member-facing production releases.

## Publishing a release update

1. Sign in with a platform administrator account.
2. Open Official announcements → Manage announcements.
3. Write a clear title and member-friendly release summary.
4. Save as a draft for review, or choose Publish now when the release is live and ready.
5. Publishing creates the public announcement and fans out one `platform_update` notification per active account.
6. Existing database notification triggers deliver the in-app notification, queue an email for confirmed email addresses, and queue browser push for members with a registered subscription.
7. The email and push workers deliver in small batches and retry temporary failures.
8. The manager marks an announcement as sent once the fan-out has been created. The database enforces one broadcast per announcement to prevent accidental duplicate sends.

## Editing and repeat communications

- Editing an already-published announcement changes the public notice only; it does not resend the same broadcast.
- For a new production release or a substantial follow-up, create a new announcement. This creates a new one-time broadcast.
- Drafts do not notify members.
- Internal commits, dependency updates, and routine maintenance are not member announcements. Only user-visible production changes should be communicated.

## Delivery scope

- In-app notifications: all non-deleted member accounts.
- Email: confirmed, non-deleted email accounts only (existing email queue policy).
- Browser push: members with an active web-push subscription only.
- No member email addresses are exposed to the browser or included in announcement pages.

## Initial login-improvement notice

Suggested title: **TIZIBANE login improvements — please try again**

Suggested message:

Hi! We've updated the TIZIBANE login system. Please try confirming your email again using the latest confirmation email in Gmail.

After tapping the link, you should be taken straight into TIZIBANE, already signed in.

Please let me know whether it works. If it doesn't, send me a screenshot of what appears. Thank you!

Only publish this notice after the login changes and delivery pipeline are deployed and a real confirmation test has succeeded.
