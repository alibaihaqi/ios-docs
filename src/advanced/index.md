---
title: iOS Advanced — persistence, auth, tests, and distribution
tier: advanced
platform: ios
---

# iOS Advanced

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Advanced

## What you'll build

You extend the MVVM async list app from the Intermediate tier with SwiftData persistence, Sign in with Apple authentication, secure token storage, unit and UI tests, CI/CD, push notifications, Instruments profiling, and TestFlight distribution.

## Prerequisites

- Complete the [Intermediate tier](../intermediate/) (MVVM list app with URLSession)
- Xcode 16+
- An Apple Developer account (free or paid — needed for push notifications and TestFlight)
- A physical iOS device (optional for push notifications; simulator works for the rest)

## The ladder

1. [01 Why SwiftData](./01-why-swiftdata.md) — from network-only to local persistence
2. [02 Add SwiftData](./02-add-swiftdata.md) — ModelContainer, @Model, CRUD operations
3. [03 Sign in with Apple](./03-sign-in-with-apple.md) — AuthenticationServices, Apple ID credential
4. [04 Secure token storage](./04-secure-token-storage.md) — Keychain wrapper, @Observable token manager
5. [05 Unit tests](./05-unit-tests.md) — XCTest for ViewModel + Model layers
6. [06 UI tests](./06-ui-tests.md) — XCUITest for navigation flows
7. [07 CI/CD with GitHub Actions](./07-ci-cd-github-actions.md) — xcodebuild, test, archive
8. [08 Push notifications](./08-push-notifications.md) — register, handle payload, display
9. [09 Instruments profiling](./09-instruments-profiling.md) — time profiler, leaks, memory graph
10. [10 TestFlight distribution](./10-testflight-distribution.md) — archive, export, upload

**Start** → [01 Why SwiftData](./01-why-swiftdata.md)
