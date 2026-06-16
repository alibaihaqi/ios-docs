---
title: Ship a one-screen list app
tier: beginner
platform: ios
position: 11
---

# Ship a one-screen list app

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Beginner › Ship a one-screen list app

**Goal**

You will assemble every concept from the tier into one polished SwiftUI screen — a habit list app — that builds in Xcode and runs in the iOS Simulator. After this page you will have shipped the tier exit artifact.

**Prerequisites**

- [Install Xcode](./01-install-xcode.md)
- [Structs](./04-structs.md)
- [The View protocol](./05-the-view-protocol.md)
- [View modifiers](./07-view-modifiers.md)
- [List](./09-list.md)
- [ForEach and Identifiable](./10-foreach-and-identifiable.md)

## What you'll build

A single-screen iOS app titled **Habits**. It shows a hard-coded array of five habits, each with a name, a short note, and a streak count. The screen has a navigation title at the top, an inset-grouped list in the body, and uses SwiftUI's default system colors so it adapts to light and dark mode without extra code.

No state changes, no editing, no persistence — that's the next tier. The point here is: build once, run in the Simulator, see the list.

## Final code

Open the `HelloIOS` project. Open `ContentView.swift` and replace the entire contents with:

```swift
import SwiftUI

struct Habit: Identifiable {
    let id: UUID = UUID()
    let title: String
    let note: String
    let streak: Int
}

struct HabitRow: View {
    let habit: Habit

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(habit.title)
                    .font(.headline)
                Text(habit.note)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(String(habit.streak) + "d")
                .font(.title3)
                .foregroundStyle(.tint)
        }
        .padding(.vertical, 4)
    }
}

struct ContentView: View {
    let habits: [Habit] = [
        Habit(title: "Read", note: "20 pages, any book", streak: 12),
        Habit(title: "Walk", note: "30 minutes outside", streak: 7),
        Habit(title: "Hydrate", note: "2 litres of water", streak: 4),
        Habit(title: "Sleep early", note: "Lights off by 23:00", streak: 2),
        Habit(title: "Stretch", note: "10 minutes after waking", streak: 0),
    ]

    var body: some View {
        NavigationStack {
            List {
                ForEach(habits) { habit in
                    HabitRow(habit: habit)
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Habits")
        }
    }
}

#Preview {
    ContentView()
}
```

A few things to read:

- `Habit` is the data shape. It conforms to `Identifiable` so `ForEach` can key rows by `id`.
- `HabitRow` is a custom `View` that takes one habit and lays out its row. Pulling it out of `ContentView` keeps the parent body short.
- `NavigationStack` provides the navigation bar so `.navigationTitle("Habits")` can render the title at the top.
- `Spacer()` pushes the streak count to the right edge of each row.

## Run it

Pick a simulator in Xcode's device dropdown — **iPhone 15** is a safe default. Press **Cmd-R**.

The iOS Simulator opens. After a few seconds you should see:

- A navigation bar at the top titled **Habits**.
- Five rows in inset-grouped list style.
- Each row: title on top, gray note underneath, blue streak count on the right.

Stop the run with **Cmd-.** when you're done.

The exit artifact is shipped.

---

## You finished a beginner tier. What's next?

Two paths from here.

1. **Go deeper on the same platform.** The intermediate tier on this same site teaches you to ship a thing that persists, tests itself, and talks to the world. If you liked beginner, that's the natural next step.
2. **Pick up an adjacent platform.** The table below routes you across platforms based on what you actually want to build.

| You just finished | Natural next platform | Why |
|---|---|---|
| iOS beginner | iOS intermediate, then Android beginner | Stay native, then learn the other mobile platform with a head start on the Compose/SwiftUI mental model. |
| Android beginner | Android intermediate, then Golang beginner | Backend-for-frontend pairs naturally with a mobile client. |
| Golang beginner | AWS beginner, then Golang intermediate | Deploy your endpoint before adding persistence/tests. |
| Java beginner | Java intermediate, then AWS beginner | JVM persistence + validation first, then deploy. |
| AWS beginner | Golang beginner | Have a backend to deploy. AWS without a service to host is reference, not curriculum. |

Or jump back to the [Hub](https://alibaihaqi.github.io/learning-docs/) and pick a different goal.
