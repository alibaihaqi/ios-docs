---
title: Why SwiftData
tier: advanced
platform: ios
position: 1
---

# Why SwiftData

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Advanced › Why SwiftData

**Goal**

Understand why local persistence matters and how SwiftData compares to Core Data, then add a local "favorite" feature to the intermediate list app.

**Prerequisites**

- Intermediate MVVM list app (URLSession + async/await)

## The persistence gap

The intermediate app fetches data from a public API every launch. This means:

- **No offline access** — the screen is blank without network.
- **Slow start** — users stare at a spinner before seeing content.
- **No user data** — bookmarks, favorites, or notes can't be saved.

Local persistence fixes all three. You cache API results and store user-created data in a database on the device.

## SwiftData vs Core Data

| Feature | Core Data | SwiftData |
|---------|-----------|-----------|
| API style | Objective-C heritage, `NSManagedObject` | Swift-native with `@Model` macro |
| Boilerplate | NSPersistentContainer, entity descriptions, codegen | `ModelContainer` + `@Model` — zero config |
| Concurrency | Manual `viewContext` / `performBackgroundTask` | `@MainActor` by default, `ModelActor` for background |
| Observable | `@ObservedObject` for fetch results | `@Query` auto-refreshes the view |
| Migration | Lightweight + heavy (versioning) | Automatic lightweight |

SwiftData is not a wrapper around Core Data — it's a separate framework built on the same SQLite storage engine, but with a modern Swift-first API.

## Plan for this tier

Over the next pages you will:

1. Add SwiftData to the project (this page)
2. Create `@Model` classes for cached items and user favorites
3. Replace the intermediate `@ObservableObject` ViewModel with a SwiftData-backed one
4. Favorites persist across launches and sync with the list view

## Add SwiftData to the project

In your intermediate Xcode project, add the import:

```swift
import SwiftData
```

Every SwiftData app needs a `ModelContainer` in the app entry point:

```swift
import SwiftUI
import SwiftData

@main
struct ListApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [CachedItem.self])
    }
}
```

The `.modelContainer` modifier creates the container and injects it into the environment. The `CachedItem` model is defined next.

**Next:** [Add SwiftData](./02-add-swiftdata.md) — define `@Model` classes and build a CRUD ViewModel.
