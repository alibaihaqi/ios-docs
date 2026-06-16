---
title: Text, VStack, HStack
tier: beginner
platform: ios
position: 6
---

# Text, VStack, HStack

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Beginner › Text, VStack, HStack

**Goal**

You will arrange multiple `Text` views into a vertical and horizontal layout using `VStack` and `HStack`. After this page you will be able to build any non-scrolling SwiftUI screen — they are all stacks of stacks.

**Prerequisites**

- [The View protocol](./05-the-view-protocol.md)

## The three primitives

- `Text("hi")` — renders a string.
- `VStack { ... }` — stacks its children top-to-bottom.
- `HStack { ... }` — stacks its children left-to-right.

Both stacks accept the same trailing-closure syntax from page 03 — a brace block of child views.

A SwiftUI view body can contain at most a handful of children at the top level (technically 10, before you need a workaround). In practice you reach for a stack as soon as you have two siblings — `body` returns "one thing", and that one thing is usually a `VStack`.

## Write a small layout

In the `HelloIOS` project, open `ContentView.swift`. Replace the contents with:

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack {
            Text("Today")
            HStack {
                Text("Mei")
                Text("·")
                Text("3-day streak")
            }
            Text("Tap to log in")
        }
    }
}

#Preview {
    ContentView()
}
```

The canvas shows three vertical rows. The middle row is the `HStack` — three text views laid out left-to-right with no spacing rules yet.

Add spacing arguments to see the difference:

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Today")
            HStack(spacing: 8) {
                Text("Mei")
                Text("·")
                Text("3-day streak")
            }
            Text("Tap to log in")
        }
    }
}

#Preview {
    ContentView()
}
```

Each stack takes an optional `spacing:` argument (CGFloat — Swift's float type for screen coordinates). The canvas updates immediately.

That is the layout vocabulary for the rest of the tier: one outer `VStack`, occasional `HStack`s inside, and `Text` at the leaves.

**For frontend developers**

`VStack` is `display: flex; flex-direction: column;`. `HStack` is `display: flex; flex-direction: row;`. `spacing:` is `gap:`. The mental model lifts cleanly — no `width: 100%` or `height: 100%` is needed because SwiftUI sizes each child to its content by default.

**Next** → [View modifiers](./07-view-modifiers.md)
