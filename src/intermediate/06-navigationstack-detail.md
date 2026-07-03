---
title: NavigationStack detail
tier: intermediate
platform: ios
position: 6
---

# NavigationStack detail

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Intermediate › NavigationStack detail

**Goal**

You will write `RootView` and `PostDetailView` and wire everything into a
working `NavigationStack`. After this page the app loads posts, renders them
in a list, and pushes a detail screen when a row is tapped.

**Prerequisites**

- [05 Loading and error states](./05-loading-error.md)

## RootView

`RootView` owns the single `PostsViewModel` instance. It creates a
`NavigationStack`, puts `PostsView` inside it, and registers the detail
destination. Add `RootView.swift`:

```swift
import SwiftUI

struct RootView: View {
    @StateObject private var viewModel = PostsViewModel()

    var body: some View {
        NavigationStack {
            PostsView(viewModel: viewModel)
                .navigationTitle("Posts")
                .navigationDestination(for: Int.self) { id in
                    PostDetailView(id: id, posts: currentPosts)
                }
        }
    }

    private var currentPosts: [Post] {
        if case .loaded(let posts) = viewModel.state { return posts }
        return []
    }
}
```

`@StateObject` is used here because `RootView` creates and owns the view model.
`PostsView` receives the same instance via `@ObservedObject` (see page 04), so
both the list and the detail screen share a single source of truth.

`.navigationDestination(for: Int.self)` registers a closure that builds a detail
view for any `Int` value pushed onto the stack. `PostList` pushes `post.id`
(an `Int`) when a row is tapped, so this destination handles it.

`currentPosts` extracts the post array from the view model's state. If the state
is not `.loaded`, it returns an empty array so the detail view can still render
gracefully with a "Not found" message.

## PostDetailView

```swift
struct PostDetailView: View {
    let id: Int
    let posts: [Post]
    var body: some View {
        let post = posts.first { $0.id == id }
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text(post?.title ?? "Not found").font(.headline)
                Text(post?.body ?? "")
            }
            .padding()
        }
        .navigationTitle("Post \(id)")
    }
}
```

The view receives the full post array and the tapped `id`, then looks up the
post at render time. `ScrollView` + `VStack` handles bodies that are longer
than the screen. `.navigationTitle` places the post number in the navigation
bar.

## Wire up the entry point

In `PostsApp.swift` (the `@main` entry point), replace `ContentView()` with
`RootView()`:

```swift
import SwiftUI

@main
struct PostsApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
```

## Manual Simulator checkpoint

Build and run in Xcode (**Cmd-R**) with an iPhone simulator selected.

Expected sequence:

1. App launches — spinner visible while the request is in flight.
2. Spinner disappears — list of 100 post titles appears.
3. Tap a row — detail screen slides in with the post title and body.
4. Swipe back (or tap the back button) — returns to the list.

If the request fails (no network), the error message and Retry button appear.
Tapping Retry calls `viewModel.load()` again.

This is a manual check; no automated test exists in this tier. The intermediate
tier's exit artifact is the working async list-with-navigation app.

---

## You finished the intermediate tier. What's next?

| You just finished | Natural next step | Why |
|---|---|---|
| iOS intermediate | iOS advanced | Add persistence (SwiftData/Core Data) and tests. |
| iOS intermediate | Android beginner | Learn the other mobile platform — Compose shares the declarative mental model. |
| iOS intermediate | Golang beginner | Write a backend your app can talk to instead of a fake API. |

Or return to the [Hub](https://alibaihaqi.github.io/learning-docs/) to pick a
different track.
