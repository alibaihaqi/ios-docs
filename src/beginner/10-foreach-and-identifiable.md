---
title: ForEach and Identifiable
tier: beginner
platform: ios
position: 10
---

# ForEach and Identifiable

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Beginner › ForEach and Identifiable

**Goal**

You will render a `List` from an array of structs by making the struct conform to `Identifiable`. After this page you will be able to drive a list from any array of data — the last piece the exit artifact needs.

**Prerequisites**

- [Structs](./04-structs.md)
- [List](./09-list.md)

## Why Identifiable matters

SwiftUI re-runs `body` constantly. When a list's data changes, SwiftUI needs to know which row is which — otherwise it can't animate the right row in or out, and it can't tell a "new row" from "the same row with edited text".

It does that by asking each item: "what's your stable ID?". The `Identifiable` protocol is the contract for that question. Any type that conforms must expose a property called `id` whose value uniquely identifies it.

The pieces:

- `Identifiable` — a one-property protocol from Swift's standard library.
- `id: UUID` — a universally unique 128-bit identifier. `UUID()` makes a fresh one. This is the lazy, always-correct default.
- `ForEach(items) { item in ... }` — the SwiftUI loop that turns an array into views. Inside `List`, `ForEach` is the standard way to render dynamic rows.

For everything `Identifiable` can do, see the [Swift documentation](https://developer.apple.com/documentation/swift/identifiable).

## Render a list from an array of structs

Open `ContentView.swift` in `HelloIOS` and replace the contents with:

```swift
import SwiftUI

struct Habit: Identifiable {
    let id: UUID = UUID()
    let title: String
    let streak: Int
}

struct ContentView: View {
    let habits: [Habit] = [
        Habit(title: "Read", streak: 3),
        Habit(title: "Walk", streak: 7),
        Habit(title: "Hydrate", streak: 1),
        Habit(title: "Sleep early", streak: 0),
    ]

    var body: some View {
        List {
            ForEach(habits) { habit in
                HStack {
                    Text(habit.title)
                    Spacer()
                    Text(String(habit.streak) + " days")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

#Preview {
    ContentView()
}
```

The canvas shows four rows. Each row has the habit name on the left and the streak count on the right, separated by `Spacer()` — a flexible view that takes up all remaining space along the stack's axis.

Read each piece:

- `struct Habit: Identifiable` — the struct promises an `id`. Because `id` is `let id: UUID = UUID()` with a default, the memberwise initializer doesn't need it as an argument (Swift fills in the default).
- `let habits: [Habit] = [...]` — a hard-coded array on the view itself. The next tier replaces this with a model object.
- `ForEach(habits) { habit in ... }` — trailing-closure loop. Because `Habit` is `Identifiable`, we did not have to write `ForEach(habits, id: \.id)` — SwiftUI infers the key path from the protocol.

You now have every piece of the tier exit artifact. The next page assembles it into a clean, ready-to-ship project.

**Next** → [Ship a one-screen list app](./11-ship-list-app.md)
