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

## Android prototype build result

- **Approved permanent Android application ID:** `com.royaltystudios.tizibane`.
- The user explicitly approved this exact ID on 14 November 2026. It is now set in `android/twa-manifest.json` and must remain stable for future upgrades.\n- Bubblewrap generated the Android project and built an unsigned aligned APK plus an unsigned Android App Bundle.\n- Successful CI run: [#43546263788](https://github.com/samvolume1-hub/tizibane-africa-next/actions/runs/43546263788).\n- Prototype artifact: `tizibane-android-unsigned-prototype` (APK + AAB), retained by GitHub for 7 days from 14 November 2026. This is a build artifact for engineering verification only; it is not a signed installer and must not be distributed to members.\n\n## Permanent Android signing — owner action required

The signing workflow is ready at `.github/workflows/android-signed-release.yml`. It deliberately requires a keystore controlled by the app owner; no private key is generated in CI or committed to Git.

On the Windows PC, with a JDK installed and `keytool` available in PowerShell:

```powershell
keytool -genkeypair -v -keystore "$env:USERPROFILE\tizibane-release.keystore" -storetype JKS -alias tizibane -keyalg RSA -keysize 2048 -validity 10000
```

Keep the keystore and both passwords in a secure password manager/backup. Do not upload the keystore to chat, commit it to Git, or send either password. To display the public SHA-256 certificate fingerprint:

```powershell
keytool -list -v -keystore "$env:USERPROFILE\tizibane-release.keystore" -alias tizibane
```

Copy the Base64 representation of the keystore to the clipboard for the GitHub Actions secret (do not paste it into chat):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\tizibane-release.keystore")) | Set-Clipboard
```

In the GitHub repository, open **Settings → Secrets and variables → Actions** and add these repository secrets: `ANDROID_KEYSTORE_BASE64` (paste from clipboard), `ANDROID_KEYSTORE_PASSWORD`, and `ANDROID_KEY_PASSWORD`. Use the exact passwords entered when generating the key. Then manually run the **TIZIBANE Android signed release build** workflow. It will produce signed APK/AAB candidates without exposing the keystore in the repository. Share only the SHA-256 fingerprint with the project maintainer so the public `/.well-known/assetlinks.json` association can be configured. Never share the keystore or passwords.

## Current status

- [x] Create isolated installation branch.
- [x] Remove the old browser-prompt download button/component/styles on the working branch.
- [x] Preserve the web manifest and service worker used by push notifications.
- [x] Inspect app architecture and identify Android TWA as the first packaging route.
- [x] Add an automated hosted-PWA/TWA readiness check.
- [x] Run and review the TWA readiness result.
- [x] Generate and configure the Android project.
- [x] Confirm permanent Android application ID: `com.royaltystudios.tizibane`.
- [x] Prepare a signed-build workflow that uses owner-managed GitHub Actions secrets and never commits the keystore.
- [x] Owner generated a replacement JKS signing keystore locally after the previous copy was exposed; new public SHA-256 fingerprint recorded below. Secure backup and GitHub Actions secrets are still pending.
- [ ] Build signed APK/AAB and configure Digital Asset Links using the matching SHA-256 fingerprint.
- [ ] Android real-device verification.
- [ ] Windows installer implementation and verification.
- [ ] Apple build/distribution setup and verification.
- [ ] Build the final platform chooser/download-centre UI.
- [ ] Final review, one coordinated release PR, and explicit merge/deployment approval.


### Android Digital Asset Links — certificate fingerprint configured

The owner has generated a replacement JKS signing key locally (the previous keystore copy was exposed and must not be used) and supplied this new public SHA-256 certificate fingerprint:

`3B:6C:07:88:BF:16:3C:A4:F5:69:FF:C9:5C:5D:67:B3:5B:A9:81:7D:B2:EB:A2:3B:63:81:75:CA:D3:73:44:FC`

A matching `public/.well-known/assetlinks.json` has been added on this working branch for package `com.royaltystudios.tizibane`. It is not live until this branch is approved, merged and deployed. After deployment, verify that `https://tizibane-africa-next.onrender.com/.well-known/assetlinks.json` returns the exact JSON and that Android validates the association. The signing key remains owner-controlled and is not stored in Git.
