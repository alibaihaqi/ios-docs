---
title: Loading and error states
tier: intermediate
platform: ios
position: 5
---

# Loading and error states

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Intermediate › Loading and error states

**Goal**

You will write `ErrorView` and `PostList` — the two helper views `PostsView`
delegates to. After this page every branch of `LoadState` has a concrete UI.

**Prerequisites**

- [04 Bind the view](./04-bind-view.md)

## ErrorView

Add `ErrorView` to `PostsView.swift` (or its own file):

```swift
struct ErrorView: View {
    let message: String
    let retry: () -> Void
    var body: some View {
        VStack(spacing: 12) {
            Text(message)
            Button("Retry", action: retry)
        }
        .padding()
    }
}
```

`retry` is a plain closure — the caller decides what "retry" means. `PostsView`
passes `{ Task { await viewModel.load() } }`, which creates a new unstructured
Task that calls `load()` from a synchronous context. The async call inside the
closure runs on the `@MainActor` because `PostsViewModel` is annotated with it.

## PostList

```swift
struct PostList: View {
    let posts: [Post]
    var body: some View {
        List(posts) { post in
            NavigationLink(value: post.id) {
                Text(post.title)
            }
        }
    }
}
```

`NavigationLink(value:)` is the data-driven API introduced in iOS 16. Instead
of embedding a destination view directly, it pushes a value into the enclosing
`NavigationStack`. The stack resolves the destination using
`.navigationDestination(for:)` registered on page 06.

The advantage over the older `NavigationLink(destination:)` is that the
destination view is not created until the user taps the row. The stack also
tracks the navigation path as a value you can inspect, reset, or deep-link into.

## ProgressView

The `.loading` branch in `PostsView` uses SwiftUI's built-in `ProgressView()`.
With no arguments it renders the platform's default activity indicator — a
spinning circle on iOS. You can customise it with a label or style modifier, but
the default is appropriate here.

## What the user sees

| State | Visual |
|---|---|
| `.loading` | Spinning activity indicator, centred |
| `.failed` | Error message text + "Retry" button, centred with padding |
| `.loaded` | Scrollable list of post titles; each row tappable |

The next page wraps everything in a `NavigationStack` and wires the detail view.

**Next** → [06 NavigationStack detail](./06-navigationstack-detail.md)
