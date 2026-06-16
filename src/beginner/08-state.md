---
title: State
tier: beginner
platform: ios
position: 8
---

# State

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Beginner › State

**Goal**

You will add a `@State` property to a view, mutate it from a `Button`, and watch the view re-render. After this page you will know the one reactivity primitive every SwiftUI app uses to keep the screen in sync with its data.

**Prerequisites**

- [The View protocol](./05-the-view-protocol.md)
- [View modifiers](./07-view-modifiers.md)

## Why a struct can't just hold mutable data

A SwiftUI view is a struct, and struct properties are baked in at the time the struct is created. When you tap a button and want a number on screen to go up, you need a piece of memory that:

1. Lives *outside* the struct, so SwiftUI can keep it between re-renders.
2. Triggers a re-render of the view when it changes.

`@State` is the primitive that does both. It's a *property wrapper* — a Swift feature that lets a keyword like `@State` add behavior around a property. Behind the scenes, `@State` stores the value in a small box SwiftUI owns; the view holds a reference to the box.

The two rules:

- `@State` properties are declared `private var` — they belong to one view.
- Mutating a `@State` property re-renders the view whose `body` depends on it.

## Make a counter

Open `ContentView.swift` in `HelloIOS` and replace the contents with:

```swift
import SwiftUI

struct ContentView: View {
    @State private var count: Int = 0

    var body: some View {
        VStack(spacing: 16) {
            Text("Count: " + String(count))
                .font(.largeTitle)

            Button("Increment") {
                count = count + 1
            }
            .font(.headline)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
```

Resume the canvas and click the **Live Preview** button (a small play icon in the canvas toolbar) so taps register. Tap **Increment** — the number goes up.

Three things to read:

- `@State private var count: Int = 0` — declares state with an initial value. The type can be inferred (`= 0` is enough) but spelling it out is clearer at this stage.
- `Button("Increment") { count = count + 1 }` — `Button` takes a label and a trailing closure that runs on tap. Inside the closure, you mutate `count` directly even though the surrounding struct is, technically, immutable. The property wrapper handles it.
- `Text("Count: " + String(count))` reads `count`. SwiftUI tracks which `@State` properties each `body` reads and only re-runs the bodies that need to update.

**For frontend developers**

In Vue, `ref(0)` is a reactive primitive that triggers a re-render on mutation. SwiftUI's `@State` plays the same role: a property the view watches, re-render on change. The difference is that SwiftUI runs `body` again to compute a new view, instead of patching the DOM in place.

**Next** → [List](./09-list.md)
