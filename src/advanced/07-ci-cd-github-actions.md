---
title: CI/CD with GitHub Actions
tier: advanced
platform: ios
position: 7
---

# CI/CD with GitHub Actions

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Advanced › CI/CD with GitHub Actions

**Goal**

Add a GitHub Actions workflow that builds, tests, and archives the iOS app on every push and pull request.

**Prerequisites**

- [UI tests](./06-ui-tests.md)
- A GitHub repository with the iOS project pushed

## Why CI for iOS

iOS apps are expensive to break — a bug caught after App Review or in production costs hours to fix + 1–7 days of re-review. CI catches issues on every commit, before they ship.

## The workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-and-test:
    runs-on: macos-15
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_16.app

      - name: List available simulators
        run: xcrun simctl list devices available

      - name: Build and test
        run: |
          xcodebuild test \
            -scheme ListApp \
            -sdk iphonesimulator \
            -destination 'platform=iOS Simulator,name=iPhone 16' \
            -testPlan ListAppTests \
            -testPlan ListAppUITests \
            -resultBundlePath TestResults \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_REQUIRED=NO
        env:
          DEVELOPER_DIR: /Applications/Xcode_16.app/Contents/Developer

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: TestResults.xcresult
```

### Key decisions

- `macos-15` runner — required for Xcode 16.
- `CODE_SIGNING_REQUIRED=NO` — tests run on simulator, which doesn't need signing.
- `-resultBundlePath` — saves `.xcresult` bundle for artifact download.
- `timeout-minutes: 30` — macOS runners are slower; 30 minutes prevents runaway bills.
- `if: always()` on artifact upload — uploads results even if tests fail, so you can inspect failure screenshots.

## Optional: Archive job

Add a second job that creates an `.xcarchive` and `.ipa` for TestFlight distribution:

```yaml
  archive:
    if: github.ref == 'refs/heads/main'
    needs: build-and-test
    runs-on: macos-15
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_16.app

      - name: Archive
        run: |
          xcodebuild archive \
            -scheme ListApp \
            -sdk iphoneos \
            -configuration Release \
            -archivePath ListApp.xcarchive \
            CODE_SIGN_STYLE=Manual \
            PROVISIONING_PROFILE_SPECIFIER="${{ vars.PROFILE_SPECIFIER }}" \
            DEVELOPMENT_TEAM="${{ vars.TEAM_ID }}"

      - name: Export IPA
        run: |
          xcodebuild -exportArchive \
            -archivePath ListApp.xcarchive \
            -exportPath . \
            -exportOptionsPlist ExportOptions.plist

      - name: Upload IPA
        uses: actions/upload-artifact@v4
        with:
          name: ListApp-ipa
          path: ListApp.ipa
```

## Checkpoint

Push to GitHub and open a PR. The CI workflow runs automatically:

1. macOS runner boots, selects Xcode 16
2. `xcodebuild test` runs unit + UI tests on iPhone 16 simulator
3. Test results are uploaded as artifacts

**Next:** [Push notifications](./08-push-notifications.md) — register for remote notifications and handle payloads.
