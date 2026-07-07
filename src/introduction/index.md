---
title: iOS Documentation — Introduction
tier: introduction
platform: ios
---

# iOS Documentation — Introduction

## What is iOS Development

iOS development is the practice of building mobile applications for Apple's mobile operating system, which powers the iPhone, iPad, and iPod touch. Developers write code — primarily in Swift, though Objective-C remains in widespread use — and use Apple's toolchain (Xcode, the iOS SDK, and the Simulator) to compile, test, and debug their apps before distributing them through the App Store.

Every iOS app is a bundle of compiled code, asset files, and metadata that runs inside a sandboxed runtime environment. Apple controls the hardware-software integration tightly, which means iOS apps benefit from predictable performance, consistent APIs, and a uniform screen-language interaction model that Android — with its fragmentation across OEMs — cannot match.

## The Apple Ecosystem

**App Store.** The sole distribution channel for iOS apps. Apple reviews every submission against the [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/). The review is a gate — expect 24-48 hours for the first review, and faster turnaround for updates once your account is established.

**TestFlight.** Apple's over-the-air beta distribution service. You can invite up to 10,000 testers (internal: up to 100 users from your team) before submitting to the App Store. Builds expire after 90 days. TestFlight is the standard way to get real-device feedback before going live.

**Developer Accounts.**

| Tier | Cost | Capabilities |
|------|------|-------------|
| Free | $0 | Run apps on your own device via Xcode, use Simulator, access all SDK APIs |
| Individual / Organization | $99/year | App Store distribution, TestFlight, push notifications, CloudKit, in-app purchases, App Clips, entitlements |

The free tier is sufficient to learn the entire iOS stack. You only need the paid account when you want to ship to the App Store or use services that require a signed entitlement (push notifications, Sign in with Apple, iCloud).

**Simulator vs Real Device.** The iOS Simulator (part of Xcode) runs a version of iOS on your Mac. It is fast, convenient, and sufficient for most UI development. However, the Simulator does not simulate: camera, accelerometer, gyroscope, push notifications (fully), or Metal performance characteristics. Real-device testing is essential before shipping.

## Swift vs Objective-C

**Objective-C** dates to the 1980s. It is a strict superset of C with Smalltalk-style message passing. Apple adopted it for NeXTSTEP, which became macOS and iOS. The language uses `[object message]` syntax, header/implementation file pairs (`.h` / `.m`), manual reference counting (now ARC), and dynamic dispatch everywhere. UIKit — the imperative UI framework that predates SwiftUI — is written in Objective-C, and large parts of the Apple SDK still expose Objective-C interfaces.

**Swift** was introduced in 2014. It is a modern, type-safe, compiled language with optional chaining, pattern matching, generics, protocol-oriented programming, value semantics (structs), and built-in concurrency (`async/await`, actors). Swift is the recommended language for all new iOS projects. It is source-compatible with Objective-C via a bridging header, and you can mix both languages in a single project.

Both language sections exist in this documentation site for deeper dives. See [Objective-C](../objective-c/) and [Swift](../swift/).

## How This Site Works

The iOS documentation is organised into **five content tiers** that build on each other, plus **two language reference sections** that are standalone dives into Objective-C and Swift.

Each tier teaches by building a **concrete artifact** — a real, runnable iOS project — not abstract exercises. You follow the pages in order, and at the end of each tier you have something working on your Mac or device.

**The language sections** (Objective-C and Swift) are reference-grade explorations of each language's syntax, idioms, and ecosystem. They do not assume you are building the tier project. You can read them alongside any tier, or independently.

### Tier Overview

- **Introduction** (you are here): What iOS development is, the ecosystem, how this site works, and how to get set up.
- **Beginner:** Build a SwiftUI list app from zero. Install Xcode, learn Swift values, functions, structs, the `View` protocol, `@State`, `List`, `ForEach`, and ship a one-screen app to the Simulator. No prior iOS experience required.
- **Intermediate:** Refactor the beginner app into MVVM. Add async data loading with `URLSession`, a `NavigationStack` detail screen, and proper loading/error states. You learn the architecture patterns every production app uses.
- **Advanced:** Production-ready iOS. SwiftData persistence, Sign in with Apple, secure token storage, unit tests, UI tests, CI/CD with GitHub Actions, push notifications, Instruments profiling, and TestFlight distribution.

### Language Sections

**Objective-C (12 pages):** Why Objective-C, syntax foundations, classes and objects, memory management (ARC vs MRC), categories and protocols, Foundation essentials, blocks, UIKit with Objective-C, error handling (`NSError`), KVO and `NotificationCenter`, ObjC-Swift interop, and testing Objective-C code.

**Swift (14 pages):** Why Swift, types and optionals, functions and closures, structs and classes, enums and pattern matching, protocols and protocol-oriented programming, generics, error handling, property wrappers and result builders, Swift concurrency (`async/await`, actors, `AsyncSequence`), Swift Package Manager, iOS patterns in Swift, testing Swift code, and Swift-ObjC interop.

## Prerequisites

- A Mac (Intel or Apple Silicon) running **macOS 14 (Sonoma)** or later.
- About **10 GB** of free disk space for Xcode and the iOS SDK.
- Basic programming familiarity (what a variable, function, and loop are) — but the Beginner tier starts from zero, so you can learn as you go.

## Next

Ready to start? Head to the **[Beginner tier](../beginner/)** and begin with installing Xcode.
