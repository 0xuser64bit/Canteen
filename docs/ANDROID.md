# Canteen on Android

The Kotlin app in `android/` opens Canteen as a Trusted Web Activity (TWA).
The installed browser renders the same responsive app, handles university sign-in,
file selection, Android back navigation and the keyboard. Web improvements reach
the APK without maintaining a second version of student journeys. There is no
WebView, JavaScript bridge, native copy of a session, or wallet integration.

The APK requires a compatible installed browser. If the browser cannot verify
that Canteen owns the app, it shows a Custom Tab with the site's address. This is
an intentional security fallback. Fullscreen requires Digital Asset Links.

## Build and check

Install JDK 21 and Android command-line tools, then set `JAVA_HOME` and
`ANDROID_HOME` for your machine. Install the SDK packages:

```sh
sdkmanager 'platforms;android-37.0' 'build-tools;37.0.0' 'platform-tools'
cd android
./gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

The Gradle wrapper includes its distribution checksum. Android Gradle Plugin 9.3
includes Kotlin support, so a separate Kotlin Gradle plugin is unnecessary.

The default debug APK points to `http://localhost:3000/campus`. Override the origin
when testing on another port or against an HTTPS deployment:

```sh
./gradlew -PcanteenOrigin=http://localhost:3100 :app:assembleDebug
adb reverse tcp:3100 tcp:3100
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n app.canteen.android.debug/app.canteen.android.MainActivity
```

Use a disposable local database and student accounts when testing. Development
email codes stay in the local server console. An emulator's localhost reaches the
computer only while the matching `adb reverse` mapping is active.

HTTP origins are limited to localhost and 127.0.0.1. Release builds register Android App Links; debug builds can receive explicit
activity launch intents for testing. Incoming launch links must
match the configured scheme, host and port; other links fall back to My campus.
Links opened within the browser retain the browser's origin and security checks.

## Sign and verify a distributable APK

The canonical deployment is `https://teamcanteen.vercel.app`. A private release
key was created at `~/.config/canteen/android/canteen-release.p12`; the adjacent
`signing.properties` holds its credentials with owner-only permissions. These
files are deliberately outside the repository. Back up the complete directory
securely: losing the signing key prevents direct APK updates to existing installs.

To build with that key:

```sh
cd android
./gradlew -PcanteenOrigin=https://teamcanteen.vercel.app \
  -PcanteenSigningProperties="$HOME/.config/canteen/android/signing.properties" \
  :app:assembleRelease :app:lintRelease
```

The signed result is `app/build/outputs/apk/release/app-release.apk`. The optional
properties file uses `storeFile`, `storePassword`, `keyAlias` and `keyPassword`.
Do not commit that file or log its contents. CI does not load signing credentials.

Build against the canonical HTTPS deployment, with no path or trailing query:

```sh
cd android
./gradlew -PcanteenOrigin=https://YOUR_CANTEEN_DOMAIN :app:assembleRelease
```

Release builds reject local or HTTP origins. Without signing configuration, the generated release APK is unsigned
at `app/build/outputs/apk/release/app-release-unsigned.apk`. Use Android Studio's
**Generate Signed Bundle / APK**, or `apksigner`, with a persistent private upload
key. Keep the keystore and passwords outside Git, back them up securely, and reuse
the same signing identity for app updates. A debug-signed APK is a test artifact.

1. Obtain the signing certificate's SHA-256 fingerprint with `keytool -list -v`.
2. Configure Canteen's `/.well-known/assetlinks.json` with the package name
   `app.canteen.android` and that fingerprint. If Play App Signing is used, include
   the **app signing** certificate, rather than only the upload certificate.
3. Serve the file directly over HTTPS from the exact APK origin, with status 200
   and JSON content type. Redirects and a different hostname do not establish
   trust for the launch origin.
4. Install the signed APK and confirm both app-link verification and launch in a
   TWA without the Custom Tab address bar. Verify using the actual signing key;
   debug certificates and browser verification overrides do not prove release
   trust.

`app.canteen.android.debug` is separate from the release app. Do not publish its
shared development certificate as the production app's identity. The Android
shell does not store emails or session tokens. Browser cookies and site data are
owned by the browser; uninstalling the APK does not sign out of the site. Sign
out through Canteen when using a shared device.

## Device review

### Verification on 20 October 2026

- Debug and signed release APKs build. Kotlin URL checks pass, including foreign
  hosts, ports, schemes, credentials and malformed links. Release lint reports no
  errors; its only warning is a newer Gradle version being available.
- The release APK's v2 signature verifies and matches the certificate in
  `public/.well-known/assetlinks.json`. It targets `https://teamcanteen.vercel.app`.
- The debug APK was installed on the dedicated API 36.1 Canteen QA emulator.
  Runtime testing found and fixed a missing browser-helper activity declaration;
  activity diagnostics then confirmed launch into Chrome's CustomTabActivity.
- The signed APK installs on that emulator (Android 16 / API 36.1, Chrome
  134.0.6998.135). After deployment, Android's domain verifier reports
  `teamcanteen.vercel.app: verified` for the actual release certificate. A visual
  fullscreen launch and end-to-end native student flows remain to be checked.
  Browser automation was disabled during final review, and the founder chose to
  continue with the available checks.
- Separate mobile web tests used disposable Stanford and MIT student accounts
  through development email-code authentication, with external mail disabled.
  They exercised campus isolation, a public reply, filter retention and sign-out.
  They are not a substitute for native keyboard, picker or physical-phone tests.
- The founder installed the signed APK on a physical Android device and reported
  that it seems fine. Device/browser versions and individual flow results were
  not recorded; the detailed hardware review below remains open. Web UI updates
  reach the installed TWA through its hosted site without rebuilding the shell.

Review the signed binary on a real Android phone before a public release, in
addition to emulator checks:

- Cold launch, existing session, university email code, expired/wrong code,
  sign-out, sign-in return to a thread, and suspended-account access.
- Campus and Everyone feeds, filters, thread back navigation, notifications,
  reply deep links, account collections and Settings.
- Compose and reply with the keyboard open: send controls remain reachable,
  multiline input works, draft context survives navigation, and duplicates are
  prevented during retries.
- Photo picker, cancel, description, successful upload and failure recovery.
- Portrait and landscape, system gestures and three-button navigation, large
  text, light/dark themes, reduced motion and screen-reader labels.
- Offline launch/reconnection, browser update, background/resume and app update.
- Canonical domain and certificate verification, rejected foreign launch links,
  external links showing their origin, and a missing TWA-capable browser.

The local checks here do not establish Google Play approval, real-device behavior,
or production email delivery. Record tested device/browser versions and any
remaining issues alongside a release.

## References

- [Android Trusted Web Activities](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities)
- [Android Browser Helper](https://github.com/GoogleChrome/android-browser-helper)
- [Digital Asset Links and signing keys](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start)
- [Android Gradle Plugin 9.3 compatibility](https://developer.android.com/build/releases/agp-9-3-0-release-notes)
