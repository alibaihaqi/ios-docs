---
title: List
tier: beginner
platform: ios
position: 9
---

# List

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Beginner › List

**Goal**

You will render a hard-coded array of strings as a scrollable iOS list. After this page you will know how to ship the most common screen in mobile apps: a vertical list of rows.

**Prerequisites**

- [Text, VStack, HStack](./06-text-stacks.md)
- [View modifiers](./07-view-modifiers.md)

## What List is

`List` is the SwiftUI view that gives you the native iOS list — rounded rows, scrolling, separators between rows, edge-to-edge styling. You do not lay it out manually; you hand it children and it arranges them.

There are two ways to feed `List` data:

1. **Static**: pass children directly in a trailing closure, the way you pass children to `VStack`. Used when you know all the rows at compile time.
2. **Dynamic**: pass an array and a row-builder closure. Used when the rows come from data. The next page covers this.

This page covers the static form. For everything `List` supports, see the [SwiftUI List reference](https://developer.apple.com/documentation/swiftui/list).

## Render a static list

Open `ContentView.swift` in `HelloIOS` and replace the contents with:

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        List {
            Text("Read 20 pages")
            Text("Walk 30 minutes")
            Text("Drink water")
            Text("Sleep by 23:00")
        }
    }
}

#Preview {
    ContentView()
}
```

The canvas now shows four rows in the native iOS list style — grouped, separators between rows, scrollable if the list grows past the screen.

Add a title and styling:

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        List {
            Text("Read 20 pages")
            Text("Walk 30 minutes")
            Text("Drink water")
            Text("Sleep by 23:00")
        }
        .listStyle(.insetGrouped)
    }
}

#Preview {
    ContentView()
}
```

`.listStyle(.insetGrouped)` picks the inset card style common in iOS Settings. Other values worth trying: `.plain`, `.grouped`. Swap them in the canvas and watch the rows re-style.

This works because we know the rows up front. The next page handles the case where the rows come from an array — which is what the tier exit artifact needs.

**Next** → [ForEach and Identifiable](./10-foreach-and-identifiable.md)
