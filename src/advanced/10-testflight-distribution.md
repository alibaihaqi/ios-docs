---
title: TestFlight distribution
tier: advanced
platform: ios
position: 10
---

# TestFlight distribution

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Advanced › TestFlight distribution

**Goal**

Archive the app, export an IPA, upload to App Store Connect, and distribute via TestFlight to internal and external testers.

**Prerequisites**

- [Instruments profiling](./09-instruments-profiling.md)
- An active Apple Developer account ($99/year or org membership)
- App Store Connect record created (bundle ID, app name, screenshots)

## Step 1: Archive

In Xcode: Product → Archive.

Or via command line:

```bash
xcodebuild archive \
  -scheme ListApp \
  -sdk iphoneos \
  -configuration Release \
  -archivePath ListApp.xcarchive
```

The archive bundles the compiled binary, dSYM symbols, and asset catalog into a `.xcarchive` package.

## Step 2: Export IPA

Create `ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
```

Export:

```bash
xcodebuild -exportArchive \
  -archivePath ListApp.xcarchive \
  -exportPath . \
  -exportOptionsPlist ExportOptions.plist
```

This produces `ListApp.ipa`.

## Step 3: Upload to App Store Connect

### Using Xcode

In the Archives organizer (Window → Organizer), select the archive and click **Distribute App** → **App Store Connect** → **Upload**.

### Using command line (CI)

```bash
xcrun altool --upload-app \
  -f ListApp.ipa \
  -t ios \
  -u "$APPLE_ID" \
  -p "$APP_SPECIFIC_PASSWORD"
```

App-specific passwords are generated at [appleid.apple.com](https://appleid.apple.com) → App-Specific Passwords.

### Using notarytool (preferred for CI)

Modern authentication uses App Store Connect API keys:

```bash
xcrun notarytool submit ListApp.ipa \
  --apple-id "$APPLE_ID" \
  --team-id "$TEAM_ID" \
  --password "$APP_SPECIFIC_PASSWORD" \
  --wait
```

## Step 4: TestFlight

Once uploaded, go to [App Store Connect](https://appstoreconnect.apple.com):

1. **My Apps** → **ListApp** → **TestFlight** tab
2. The uploaded build appears under **iOS Builds** (processing takes 5–30 minutes)
3. Enable the build for testing
4. Add internal testers (up to 100, added by Apple ID email)
5. Optionally submit for **External Testing** (Beta App Review required, 1–2 days)

## Step 5: Install TestFlight build

Testers install TestFlight from the App Store, then tap the invitation link or redeem code. The build downloads and installs alongside your development version.

## Checkpoint

- Archive completes without errors.
- IPA exports successfully.
- Upload to App Store Connect succeeds (HTTP 200 / no errors).
- Build appears in TestFlight under "iOS Builds" within 30 minutes.
- Testers receive the invitation and can install the app.

**You've completed the iOS Advanced tier.** The intermediate MVVM list has grown into a full-featured iOS app with SwiftData persistence, Sign in with Apple, secure token storage, unit/UI tests, CI/CD, push notifications, Instruments profiling, and TestFlight distribution.
