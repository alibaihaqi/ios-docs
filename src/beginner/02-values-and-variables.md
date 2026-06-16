---
title: Swift values and variables
tier: beginner
platform: ios
position: 2
---

# Swift values and variables

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Beginner › Swift values and variables

**Goal**

You will read and write the two Swift keywords that hold values: `let` and `var`. After this page you will be able to declare typed and inferred values and tell the compiler when something is allowed to change.

**Prerequisites**

- [Xcode installed](./01-install-xcode.md)

## let, var, and type inference

Swift has two ways to name a value:

- `let` makes a *constant*. Once set, the name always points to the same value.
- `var` makes a *variable*. The name can be reassigned later.

Swift is statically typed: every value has a type known at compile time. You can write the type yourself or let the compiler infer it from the assigned value.

The three built-in types you will use constantly in SwiftUI are `String`, `Int`, and `Bool`. Arrays are written `[Element]`, so an array of strings is `[String]`.

For the full Swift language reference, see the [Swift book](https://docs.swift.org/swift-book/). This page covers only the pieces the rest of the tier needs.

## Try it in a playground

In Xcode, choose **File → New → Playground**, pick **Blank** under the **iOS** tab, save it as `SwiftBasics.playground`. Replace the contents with:

```swift
import Foundation

let name: String = "Mei"
var streak: Int = 3
let isActive: Bool = true

streak = streak + 1

let items: [String] = ["Read", "Walk", "Sleep"]
let firstItem = items[0]

print(name, streak, isActive, firstItem)
```

Run the playground by clicking the play button next to the last line, or press **Shift-Enter**. The bottom panel shows:

```
Mei 4 true Read
```

Two things to notice:

- `firstItem` has no explicit type. Swift infers `String` from `items[0]`.
- Trying to reassign `name = "Aarav"` would fail with a compiler error, because `name` is `let`. Try it — you will see `Cannot assign to value: 'name' is a 'let' constant`.

## When to pick which

Default to `let`. Only reach for `var` when you actually need to reassign. SwiftUI views read constants more than they read variables — most properties on a view are `let`-ish by default.

**Next** → [Functions and trailing closures](./03-functions-and-closures.md)
