---
title: Install Xcode
tier: beginner
platform: ios
position: 1
---

# Install Xcode

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Beginner › Install Xcode

**Goal**

You will install Xcode, create a new SwiftUI project, and see the default "Hello, world!" preview render. After this page you will have a working iOS toolchain and an empty project you can build on for the rest of the tier.

**Prerequisites**

- None. This is the first page of the Beginner tier.

## What Xcode is

Xcode is Apple's IDE. It bundles the Swift compiler, the iOS SDK, the iOS Simulator, and an editor with a live SwiftUI preview canvas. You cannot build iOS apps without it, and it only runs on macOS.

Pin: this page targets **Xcode 16** on **macOS 14 Sonoma** or newer. Older Xcode versions will not match the screenshots and may use older SwiftUI APIs.

## Install

Install Xcode from the Mac App Store. The download is large (around 10 GB) and takes a while — start it now and read on.

After install, open Xcode once so it can finish setting up command-line tools and accept the license. If it prompts to install additional components, accept.

Verify from a terminal:

```bash
xcodebuild -version
```

Expected output (your patch version may differ):

```
Xcode 16.0
Build version 16A242d
```

## Create your first project

In Xcode, choose **File → New → Project**. Pick the **iOS** tab, then **App**, then **Next**.

Fill in:

- **Product Name**: `HelloIOS`
- **Team**: leave as None (no Apple Developer account needed for Simulator runs).
- **Organization Identifier**: `com.example`
- **Interface**: SwiftUI
- **Language**: Swift
- **Storage**: None
- **Include Tests**: unchecked

Click **Next**, pick a folder, click **Create**.

## Confirm the preview works

Xcode opens with `ContentView.swift` selected. The default file looks like this:

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Hello, world!")
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
```

On the right side of the editor is the **canvas**. If it shows "Preview paused", click **Resume**. After a few seconds you should see a phone-shaped preview with a globe icon and "Hello, world!" underneath.

To run in the Simulator instead of the canvas: pick a simulator from the device dropdown at the top (e.g., **iPhone 15**) and press **Cmd-R**. The iOS Simulator launches as a separate app and shows the same screen.

Stop it with **Cmd-.** (Cmd-period) or the stop button in the Xcode toolbar.

**Next** → [Swift values and variables](./02-values-and-variables.md)
