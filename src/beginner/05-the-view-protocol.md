---
title: The View protocol
tier: beginner
platform: ios
position: 5
---

# The View protocol

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Beginner › The View protocol

**Goal**

You will write your own SwiftUI view from scratch — a struct conforming to the `View` protocol — and see it render. After this page you will know what `body: some View` means and why every SwiftUI view follows the same shape.

**Prerequisites**

- [Xcode installed](./01-install-xcode.md)
- [Structs](./04-structs.md)

## What View, body, and "some View" mean

A *protocol* in Swift is a contract — a list of properties and methods a type promises to provide. SwiftUI's `View` protocol has exactly one requirement: a computed property called `body` that returns something the framework knows how to draw.

The return type of `body` is written `some View`. `some View` means "an opaque type that conforms to `View`" — the compiler knows the exact type, the caller doesn't need to. This is what lets you return `VStack { Text("hi") }` (whose real type is something nasty like `VStack<TupleView<(Text)>>`) without ever spelling it out.

For everything `View` can do, see the [SwiftUI View reference](https://developer.apple.com/documentation/swiftui/view). The piece we need now is the shape: a struct with a `body` computed property.

## Write a custom view

Open the `HelloIOS` project from page 01. In the project navigator on the left, right-click the `HelloIOS` folder and choose **New File → Swift File**. Name it `Greeting.swift`.

Replace its contents with:

```swift
import SwiftUI

struct Greeting: View {
    let name: String

    var body: some View {
        Text("Hello, " + name)
    }
}

#Preview {
    Greeting(name: "Sofia")
}
```

Open the canvas (right side of the editor). Click **Resume** if the preview is paused. You should see "Hello, Sofia" rendered on a phone-shaped canvas.

Three things to notice:

- `Greeting` is a struct, just like the ones from the previous page.
- It conforms to `View` by writing `: View` after its name and providing `body`.
- `#Preview` is a macro that tells Xcode what to render in the canvas. It takes a trailing closure that returns the view.

Now use it from `ContentView`. Open `ContentView.swift` and replace its body with:

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        Greeting(name: "Olu")
    }
}

#Preview {
    ContentView()
}
```

The canvas updates to show "Hello, Olu". You just composed one view inside another — which is how every SwiftUI screen is built.

**For frontend developers**

In Vue, a single-file component exports a setup function and a template. SwiftUI's equivalent is a struct conforming to `View` with a `body` property. The struct's `let` properties play the role of props.

**Next** → [Text, VStack, HStack](./06-text-stacks.md)
