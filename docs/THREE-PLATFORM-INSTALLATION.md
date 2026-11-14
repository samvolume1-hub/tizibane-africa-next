# TIZIBANE — Three-platform installation project

**Working branch:** `build/three-platform-installation`  
**Production boundary:** `main`, Render, Supabase and member data remain unchanged until a separately approved merge/deployment.

## Release objective

Deliver one coordinated installation experience with real, tested distribution paths for:

1. Android — signed APK for direct installation, with a Play Store bundle as an optional later channel.
2. Windows — a signed or clearly identified Windows installer.
3. iPhone/iPad — Apple-supported distribution (TestFlight for beta and App Store for public release).

The download-centre UI is deliberately postponed until the relevant artifact or official distribution destination exists. Do not publish placeholder links.

## Existing foundations inspected

- Next.js 15 app served from `https://tizibane-africa-next.onrender.com`.
- Web manifest: `public/manifest.webmanifest`.
- Service worker: `public/sw.js`, used by push-notification flows independently of the old install button.
- App icons: 180×180, 192×192, and 512×512 PNG files plus SVG.
- Supabase SSR authentication and server-side application routes; this is not a static-export-only website.
- Current app uses browser Web Push APIs and a server-side push subscription flow.
- No native Android/iOS/Windows packaging project or installer artifact was present in the inspected root files.

## Platform strategy

### Android — Trusted Web Activity (TWA)

Use Google's Bubblewrap tooling to package the hosted PWA as an Android app. This avoids duplicating the Next.js/Supabase application inside a second native codebase and is appropriate for a web-first app.

Required release gates:
- Hosted PWA passes Bubblewrap's TWA quality validation.
- Confirm the final Android application ID before the first signed release; changing it later creates a different Android app identity.
- Create and securely retain one permanent Android signing keystore. Never commit it to Git.
- Build and test a signed APK on a real Android device.
- Publish the matching Digital Asset Links file at `/.well-known/assetlinks.json` on the exact production origin. Its SHA-256 certificate fingerprint must match the signing certificate.
- Verify full-screen TWA launch, sign-in/session restoration, navigation, external links, file/photo selection, camera/microphone permissions and push notifications on supported Android devices.

The first automated readiness check is in `.github/workflows/android-twa-readiness.yml`. Run [43545807328](https://github.com/samvolume1-hub/tizibane-africa-next/actions/runs/43545807328) passed. Bubblewrap's PageSpeed Insights call was rate-limited (HTTP 429), so the workflow recorded a warning and ran deterministic live checks instead: HTTPS origin, web-manifest fields, reachable 192×192 and 512×512 PNG icons with valid dimensions, and the push/notification-click service-worker handlers. All deterministic checks passed. This is a positive baseline, not a complete Lighthouse/PageSpeed quality report and not an APK build.

### Windows

The application uses Next.js server features and Supabase SSR, so a static-only desktop export is not an acceptable assumption. Select a lightweight Windows WebView2 shell or another supported wrapper only after the server-route, authentication, file/camera/microphone and notification requirements are tested. The deliverable must be a real installable Windows package, not a shortcut disguised as an installer.

### iPhone and iPad

Public distribution must use Apple's supported route: TestFlight for beta testing and/or the App Store for public availability. A Windows machine cannot complete the final Xcode build, signing and App Store submission by itself; a Mac with Xcode and the required Apple developer access will be needed for those release steps. Do not promise a normal public `.ipa` download.

## Security and cost rules

- Never commit signing keystores, passwords, service-role keys, certificates containing private keys, or other secrets.
- Do not add a paid service, purchase a developer account, change hosting, or change Supabase configuration without explicit approval.
- Keep the website as the source of truth for app features and user data.
- No music/video uploads, call recording, or call-media storage is introduced by this project.
- No merge, production deployment, or public download button until artifacts and platform checks are complete and the user approves the final release.

## Android prototype build result\n\n- Provisional Android package ID in the draft configuration: `com.royaltystudios.tizibane` (not yet owner-approved and not yet signed).\n- Bubblewrap generated the Android project and built an unsigned aligned APK plus an unsigned Android App Bundle.\n- Successful CI run: [#43546263788](https://github.com/samvolume1-hub/tizibane-africa-next/actions/runs/43546263788).\n- Prototype artifact: `tizibane-android-unsigned-prototype` (APK + AAB), retained by GitHub for 7 days from 14 November 2026. This is a build artifact for engineering verification only; it is not a signed installer and must not be distributed to members.\n\n## Current status

- [x] Create isolated installation branch.
- [x] Remove the old browser-prompt download button/component/styles on the working branch.
- [x] Preserve the web manifest and service worker used by push notifications.
- [x] Inspect app architecture and identify Android TWA as the first packaging route.
- [x] Add an automated hosted-PWA/TWA readiness check.
- [x] Run and review the TWA readiness result.
- [x] Generate and configure the Android project.
- [ ] Confirm permanent Android application ID, securely establish signing key, and build signed APK.
- [ ] Android real-device verification.
- [ ] Windows installer implementation and verification.
- [ ] Apple build/distribution setup and verification.
- [ ] Build the final platform chooser/download-centre UI.
- [ ] Final review, one coordinated release PR, and explicit merge/deployment approval.
