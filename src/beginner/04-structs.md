---
title: Structs
tier: beginner
platform: ios
position: 4
---

# Structs

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Beginner › Structs

**Goal**

You will define a Swift `struct`, give it stored properties, and create an instance. After this page you will recognize the shape every SwiftUI view is written in — because every SwiftUI view is a struct.

**Prerequisites**

- [Swift values and variables](./02-values-and-variables.md)
- [Functions and trailing closures](./03-functions-and-closures.md)

## What a struct is

A *struct* is a type you define yourself by listing the data it holds. Each piece of data is called a *stored property*. Structs in Swift are *value types* — when you pass a struct around, the receiver gets its own copy, not a reference to the original.

Two things make structs the right tool for SwiftUI views:

1. They are cheap. Creating one is roughly free.
2. They are immutable by default. SwiftUI re-creates views constantly when state changes; values that can't accidentally mutate are safe to throw away.

Swift gives every struct a *memberwise initializer* automatically — a constructor that takes one argument per stored property, in declaration order.

## Try it in a playground

In `SwiftBasics.playground`:

```swift
import Foundation

struct TodoItem {
    let title: String
    let isDone: Bool
}

let task = TodoItem(title: "Buy milk", isDone: false)

print(task.title)
print(task.isDone)
```

Run it. Output:

```
Buy milk
false
```

`TodoItem(title:isDone:)` is the memberwise initializer. You didn't write it — Swift generated it from the property list.

You can add methods inside the struct too:

```swift
import Foundation

struct TodoItem {
    let title: String
    let isDone: Bool

    func summary() -> String {
        let marker = isDone ? "[x]" : "[ ]"
        return marker + " " + title
    }
}

let task = TodoItem(title: "Walk dog", isDone: true)
print(task.summary())
```

Output:

```
[x] Walk dog
```

This is the shape a SwiftUI view takes: a struct with properties and a method (called `body`) that returns the rendered UI. We'll see that next.

**Next** → [The View protocol](./05-the-view-protocol.md)
