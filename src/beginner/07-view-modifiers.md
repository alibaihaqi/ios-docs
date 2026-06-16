---
title: View modifiers
tier: beginner
platform: ios
position: 7
---

# View modifiers

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Beginner › View modifiers

**Goal**

You will style a SwiftUI view using `padding`, `font`, and `foregroundStyle`. After this page you will know how SwiftUI styles things — by calling methods on a view, not by writing CSS.

**Prerequisites**

- [Text, VStack, HStack](./06-text-stacks.md)

## What a modifier is

A *view modifier* is a method you call on a view that returns a new, styled view. Modifiers chain — each call returns a wrapped view, so the next modifier styles the wrapping, not the original.

The three you will use constantly:

- `.padding()` — adds whitespace around the view. Optional argument: a CGFloat (e.g., `.padding(16)`) or an edge set (`.padding(.horizontal, 12)`).
- `.font(.headline)` — picks a font style from SwiftUI's [type scale](https://developer.apple.com/documentation/swiftui/font). Common values: `.largeTitle`, `.title`, `.headline`, `.body`, `.caption`.
- `.foregroundStyle(.secondary)` — picks the color. Common values: `.primary`, `.secondary`, `.red`, `.blue`, `.tint`.

Order matters. `.padding().background(.yellow)` paints the yellow outside the padding; `.background(.yellow).padding()` paints the yellow tight to the text and leaves whitespace around it.

## Style the previous layout

Open `ContentView.swift` in `HelloIOS` and replace the contents with:

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Today")
                .font(.largeTitle)

            HStack(spacing: 8) {
                Text("Mei")
                    .font(.headline)
                Text("·")
                    .foregroundStyle(.secondary)
                Text("3-day streak")
                    .foregroundStyle(.secondary)
            }

            Text("Tap to log in")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
```

The canvas now shows a large "Today" header, a smaller name with a muted middle row, and a fine-print "Tap to log in". The outer `.padding()` keeps everything off the edge of the screen.

Notice the indentation pattern: each modifier sits on its own line, prefixed with a dot. This is the standard SwiftUI style — easier to read at a glance than chains on one line.

**Next** → [State](./08-state.md)
