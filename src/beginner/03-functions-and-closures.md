---
title: Functions and trailing closures
tier: beginner
platform: ios
position: 3
---

# Functions and trailing closures

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Beginner › Functions and trailing closures

**Goal**

You will write a Swift function, pass a closure as its last argument, and use the trailing-closure shorthand. After this page you will be able to read every SwiftUI view body — they are all trailing closures stacked together.

**Prerequisites**

- [Swift values and variables](./02-values-and-variables.md)

## What a function is in Swift

A *function* is a named block of code that takes arguments and returns a value. A *closure* is the same thing without a name — a block of code you can pass around as a value.

SwiftUI is built on closures. When you write `VStack { Text("a") }`, the part in braces is a closure passed to `VStack`. Reading SwiftUI without understanding closures is guessing.

The relevant syntax rules:

- Argument types are written after each parameter name, separated by a colon.
- The return type comes after `->`.
- If a function's last parameter is a closure, you can write it *outside* the parentheses. This is called **trailing closure** syntax.
- If a function takes only one parameter and that parameter is a closure, you can drop the parentheses entirely.

## Try it in a playground

In `SwiftBasics.playground`, replace the contents with:

```swift
import Foundation

func greet(name: String) -> String {
    return "Hello, " + name
}

print(greet(name: "Aarav"))

func transform(value: Int, using operation: (Int) -> Int) -> Int {
    return operation(value)
}

let doubled = transform(value: 4, using: { number in
    return number * 2
})
print(doubled)

let tripled = transform(value: 4) { number in
    number * 3
}
print(tripled)
```

Run it. The output:

```
Hello, Aarav
8
12
```

Read each call carefully:

- `greet(name: "Aarav")` — argument labels are visible at the call site. This is normal Swift.
- `transform(value: 4, using: { ... })` — the closure is passed like any other argument.
- `transform(value: 4) { ... }` — the same call using trailing-closure syntax. The closure moves outside the parens. `return` is optional in a single-expression closure.

This last form is what SwiftUI uses everywhere. `VStack { ... }`, `Button("Tap") { ... }`, `List { ... }` — every brace block is a trailing closure.

**Next** → [Structs](./04-structs.md)
