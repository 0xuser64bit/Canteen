# Android app

`android/` packages the hosted Canteen app as a Trusted Web Activity (TWA). A
compatible installed browser owns rendering, sign-in, cookies, file selection and
navigation. There is no WebView, JavaScript bridge or native session copy. Web
changes reach installed apps through the hosted site.

Without verified Digital Asset Links, the browser shows a Custom Tab with the
site's address. This is the security fallback; fullscreen requires the exact
deployment origin and release signing identity to establish trust.

## Build and test

Install JDK 21 and Android command-line tools, and set `JAVA_HOME` and
`ANDROID_HOME` for your machine. The pinned Gradle wrapper includes a distribution
checksum; Android Gradle Plugin supplies Kotlin support.

```sh
sdkmanager 'platforms;android-37.0' 'build-tools;37.0.0' 'platform-tools'
cd android
./gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

Debug defaults to `http://localhost:3000/campus` with package
`app.canteen.android.debug`. To use a different local port:

```sh
./gradlew -PcanteenOrigin=http://localhost:3100 :app:assembleDebug
adb reverse tcp:3100 tcp:3100
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n app.canteen.android.debug/app.canteen.android.MainActivity
```

Use disposable local data; development email codes appear in the server console
when no mail provider is configured. Device localhost reaches the computer only
while the matching `adb reverse` mapping is active. HTTP origins are restricted
to localhost and 127.0.0.1.

Incoming launch links must match the configured scheme, host and effective port;
other links fall back to My campus. Release builds register Android App Links;
debug builds accept explicit activity launches for testing.

## Sign and verify a release

Release builds require a canonical non-local HTTPS origin, without credentials,
path, query or fragment. The production package is `app.canteen.android`.

```sh
./gradlew -PcanteenOrigin=https://YOUR_CANTEEN_DOMAIN \
  -PcanteenSigningProperties=/absolute/private/path/signing.properties \
  :app:assembleRelease :app:lintRelease
```

The optional signing properties file supplies `storeFile`, `storePassword`,
`keyAlias` and `keyPassword`. Keep it and the keystore outside Git, restrict
permissions, never log their contents, and back them up securely. Reuse the same
signing identity for app updates; losing it prevents direct APK updates to
existing installs. CI does not load release credentials.

With signing configured, the APK is
`app/build/outputs/apk/release/app-release.apk`. Without it, the build produces
`app-release-unsigned.apk`; sign with Android Studio or `apksigner` before
distribution. A debug-signed APK is only a test artifact.

1. Obtain the actual app-signing certificate's SHA-256 fingerprint using
   `keytool -list -v`. With Play App Signing, use the **app signing** certificate,
   not only the upload certificate.
2. Update `public/.well-known/assetlinks.json` with package `app.canteen.android`
   and that fingerprint. Never publish the shared debug certificate as the
   production identity.
3. Serve `/.well-known/assetlinks.json` directly from the exact launch origin
   over HTTPS, returning 200 and JSON content type. Redirects or another hostname
   do not establish trust.
4. Install the actual signed APK, verify Android App Links, and confirm launch
   without a Custom Tab address bar. Debug certificates and browser verification
   overrides do not prove release trust.

## Release review

Review the signed binary on a real phone; record device, Android and browser
versions and unresolved issues. Builds, unit tests and lint do not establish
runtime readiness or Google Play approval.

- Cold launch, existing session, email-code errors, sign-out, thread return and
  suspended-account access.
- Campus isolation, feeds, filters, notifications, reply links and back navigation.
- Compose/reply with the keyboard open, draft recovery and retry protection;
  photo selection, cancellation, descriptions and upload failure recovery.
- Rotation, large text, themes, reduced motion, screen reader and system navigation.
- Offline/reconnection, background/resume, browser/app updates and missing browser.
- Verified release origin/certificate, rejected foreign launch links and external
  links displaying their origin.

### Verification on 20 October 2026

The canonical deployment is `https://teamcanteen.vercel.app`.

- Debug and signed release APKs build. Kotlin URL checks pass, including foreign
  hosts, ports, schemes, credentials and malformed links. Release lint reports no
  errors; its only warning is a newer Gradle version being available.
- The release APK's v2 signature verifies and matches the certificate in
  `public/.well-known/assetlinks.json`. It targets the canonical deployment.
- The debug APK was installed on the dedicated API 36.1 Canteen QA emulator.
  Runtime testing found and fixed a missing browser-helper activity declaration;
  activity diagnostics then confirmed launch into Chrome's `CustomTabActivity`.
- The signed APK installs on that emulator (Android 16 / API 36.1, Chrome
  134.0.6998.135). After deployment, Android's domain verifier reports
  `teamcanteen.vercel.app: verified` for the actual release certificate. A visual
  fullscreen launch and end-to-end native student flows remain to be checked.
- Separate mobile web tests used disposable Stanford and MIT student accounts
  through development email-code authentication, with external mail disabled.
  They exercised campus isolation, a public reply, filter retention and sign-out.
  They are not a substitute for native keyboard, picker or physical-phone tests.
- The founder installed the signed APK on a physical Android device and reported
  that it seems fine. Device/browser versions and individual flow results were
  not recorded, so the checklist above remains the release gate.

The local checks here do not establish Google Play approval, real-device behavior,
or production email delivery. Record tested device/browser versions and any
remaining issues alongside a release.

The browser retains cookies and site data after APK removal. Uninstalling does
not sign out of Canteen; sign out through the site on shared devices.

## References

- [Android Trusted Web Activities](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities)
- [Android Browser Helper](https://github.com/GoogleChrome/android-browser-helper)
- [Digital Asset Links and signing keys](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start)
- [Android Gradle Plugin 9.3 compatibility](https://developer.android.com/build/releases/agp-9-3-0-release-notes)
