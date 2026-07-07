---
title: Getting Started with iOS Development
tier: introduction
platform: ios
---

# Getting Started with iOS Development

This page bridges the gap between "I want to learn iOS" and actually writing your first line of Swift. By the end you will understand what tools you need, how Xcode is laid out, what the Simulator does, and how to follow the rest of this documentation site effectively.

## What You Need

**Hardware.** A Mac — Intel-based or Apple Silicon (M1/M2/M3/M4). iOS development requires Xcode, which only runs on macOS. There is no official way to develop iOS apps on Windows or Linux (though services like MacStadium offer remote Macs, and tools like the [Swift toolchain](https://www.swift.org/download/) let you compile Swift on Linux).

**Software.** macOS 14 (Sonoma) or later. Older macOS versions can run older Xcode versions, but to follow this site you need at least Xcode 16+ (available on Sonoma and Sequoia).

**Disk Space.** Xcode is roughly 7-8 GB. The iOS SDK and simulator runtimes add another 3-5 GB. Plan for ~10 GB free before installing.

**Programming Familiarity.** The Beginner tier teaches Swift and iOS from zero, but you will have an easier time if you already know basic concepts: what a variable is, how functions work, and what a loop does. If you have written code in any language (Python, JavaScript, Java, C++), you are ready.

## Install Xcode

The full installation steps live in **[Beginner 01: Install Xcode](../beginner/01-install-xcode)**. The short version:

1. Open the **Mac App Store**.
2. Search for "Xcode".
3. Click **Get** (or **Install**). The download is several GB; expect 30-60 minutes depending on your connection.
4. Once installed, open Xcode. It will prompt you to installadditional components (the iOS SDK, simulator runtimes, command line tools). Accept.

You should also install the **Command Line Tools** separately, which gives you `swift`, `xcodebuild`, and `xcode-select` in your terminal:

```bash
xcode-select --install
```

This is useful for running builds from the command line, running Swift scripts, and using CI/CD later in the Advanced tier.

## Xcode Overview

When you open Xcode for the first time, you see the **Welcome to Xcode** window with recent projects and options to create a new project or clone an existing one. Once you open or create a project, the main window is divided into several areas:

```
┌─────────────────────────────────────────────────────────────┐
│  ▲ Toolbar (run, stop, scheme selector, device picker)      │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│  Navigator   │        Editor               │  Utilities    │
│  (left)      │        (center)             │  (right)      │
│              │                              │               │
│  • Project   │  • Source code editor        │  • Inspector  │
│  • Source    │  • SwiftUI canvas (Canvas)   │  • Library    │
│  • Search    │  • Interface Builder (objc)  │  • File info  │
│  • Issues    │                              │               │
│  • Tests     │                              │               │
├──────────────┴──────────────────────────────┴───────────────┤
│  ▼ Debug area (console, variables, LLDB)                    │
└─────────────────────────────────────────────────────────────┘
```

**Key panes:**

- **Navigator (Cmd-1–9):** Shows your project files, source control status, search results, build issues, and test navigator.
- **Editor:** The main editing surface. For SwiftUI projects, you also get the **Canvas** — a live preview of your UI that updates as you type. Toggle it with `Cmd-Option-Enter`.
- **Utilities (Cmd-Option-0):** Shows file metadata, the object library (drag-and-drop UI elements for UIKit), and the identity/attributes inspector.
- **Debug area (Cmd-Shift-Y):** Console output, variable inspector, and the LLDB debugger prompt. Essential when your app crashes or behaves unexpectedly.

If you are using SwiftUI (which this site does), the Canvas is your most powerful tool — it renders your UI live, and you can interact with it, inspect views, and test state changes without running the Simulator.

## iOS Simulator

The **Simulator** app runs a full iOS environment on your Mac. When you build and run from Xcode (Cmd-R), Xcode automatically launches the Simulator with your app installed and running.

**Key facts:**

- The Simulator is **not an emulator** — it runs the real iOS system frameworks compiled for x86_64 (Intel Macs) or ARM64 (Apple Silicon Macs). It is not a QEMU-style emulation of an ARM device. This means it is fast but does not perfectly replicate device behaviour.
- You can simulate different device models (iPhone 16 Pro, iPad Air, etc.) and iOS versions from the **scheme selector** in the Xcode toolbar.

**Useful keyboard shortcuts while the Simulator is focused:**

| Shortcut | Action |
|----------|--------|
| `Cmd-R` | Run the app (build + launch) |
| `Cmd-.` | Stop the running app |
| `Cmd-K` | Hide the software keyboard |
| `Cmd-Shift-H` | Press the Home button (gesture equivalent on full-screen devices) |
| `Cmd-T` | Rotate left |
| `Cmd-Shift-T` | Rotate right |
| `Cmd-E` | Shake gesture |
| `Cmd-S` | Take a screenshot (saved to desktop) |
| `Cmd-Left` / `Cmd-Right` | Rotate device |

The Simulator also supports **Simulator > Features** menu for simulating location, cellular conditions (Network Link Conditioner), Touch ID/Face ID, and Siri.

## Project Anatomy

When Xcode creates a new SwiftUI iOS app, it generates several files. Here is what each one does:

```
MyApp/
├── MyApp.xcodeproj/          ← The project file (double-click to open)
├── MyApp/
│   ├── ContentView.swift     ← The first screen. A `View` struct with `body`
│   ├── MyAppApp.swift        ← The app entry point. Marked `@main`.
│   ├── Assets.xcassets/      ← Images, colors, app icon, accent color
│   ├── Preview Content/      ← Preview data for the Canvas
│   └── Info.plist            ← Bundle metadata, permissions, supported orientations
├── MyAppTests/               ← Unit test target
└── MyAppUITests/             ← UI test target
```

**ContentView.swift** is where you start coding. By default it shows "Hello, World!". You will modify this file heavily in the Beginner tier.

**MyAppApp.swift** is the application entry point. It contains the `@main` attribute and declares the root view and the window group. You rarely edit this file directly.

**Assets.xcassets** is an asset catalogue — a structured folder for images, colours, the app icon, and the accent colour. You add assets here and reference them by name in code.

**Info.plist** is an XML file with bundle metadata. You add keys here for permissions (camera, location, notifications), supported interface orientations, and custom URL schemes.

## How to Follow This Site

Each documentation page follows a consistent structure:

```
┌────────────────────────────────────────┐
│  Goal (one sentence)                   │
│  Prerequisites (links to earlier pages)│
│  Steps with complete code              │
│  Checkpoint (concrete, verifiable)     │
└────────────────────────────────────────┘
```

**Rules for following the pages:**

1. **Read prerequisite pages first.** Every page tells you what you should have done before starting. Skipping prerequisites is the most common source of confusion.
2. **Copy-paste code blocks.** Code blocks are complete and intended for direct use. Read them to understand what they do, but you do not need to type them character by character.
3. **Reach the checkpoint.** Each page has a verifiable checkpoint — "Run the app in the Simulator. You should see a list of three items." If you do not see the expected result, something went wrong. Re-read the steps and check your code against the provided blocks.
4. **Pages build on each other.** The Beginner tier proceeds linearly. Do not skip pages. The Intermediate and Advanced tiers assume you have completed the previous tier's project or bring equivalent knowledge.

## Next Steps

You are ready to begin. If you have a Mac and are ready to install Xcode, start the **[Beginner tier](../beginner/)**.

The first page walks you through downloading and installing Xcode step by step. After that, you will write your first Swift code, understand the `View` protocol, and build a working list app — all in the Simulator.

→ **[Beginner 01: Install Xcode](../beginner/01-install-xcode)**
