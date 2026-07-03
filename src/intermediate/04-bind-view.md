---
title: Bind the view
tier: intermediate
platform: ios
position: 4
---

# Bind the view

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Intermediate › Bind the view

**Goal**

You will write `PostsView` — the SwiftUI view that owns the view model and
renders whichever `LoadState` is current. After this page the app shows a
spinner on launch, then either a list of posts or an error message.

**Prerequisites**

- [03 Async load with URLSession](./03-async-urlsession.md)

## PostsView

Add a new file `PostsView.swift`:

```swift
import SwiftUI

struct PostsView: View {
    @ObservedObject var viewModel: PostsViewModel

    var body: some View {
        Group {
            switch viewModel.state {
            case .loading:
                ProgressView()
            case .failed(let message):
                ErrorView(message: message) { Task { await viewModel.load() } }
            case .loaded(let posts):
                PostList(posts: posts)
            }
        }
        .task { await viewModel.load() }
    }
}
```

## @ObservedObject vs @StateObject

The view receives an already-created view model from its parent (`RootView`, page
06), so it uses `@ObservedObject` rather than `@StateObject`. The distinction:

| Property wrapper | Who creates the view model | Use when |
|---|---|---|
| `@StateObject` | The view itself | The view is the root owner |
| `@ObservedObject` | A parent passes it in | State is owned elsewhere |

Because `RootView` owns the single `PostsViewModel` instance and passes it down,
`PostsView` uses `@ObservedObject`. This lets `RootView` also pass the same
view model to the `navigationDestination` closure on page 06.

## .task

`.task { await viewModel.load() }` is the SwiftUI modifier for kicking off async
work tied to a view's lifetime. It runs when the view appears and is
automatically cancelled when the view disappears. It replaces the older
`.onAppear` + `Task { }` pattern.

## switch over LoadState

A `switch` on `viewModel.state` is exhaustive — Swift requires a case for every
enum value. If you add a new case to `LoadState` later (for example
`.refreshing`), the compiler immediately flags every `switch` that has not
handled it. This is the primary reason to use an enum rather than three separate
`Bool` flags.

`ErrorView` and `PostList` are helper views defined on the next page.

**Next** → [05 Loading and error states](./05-loading-error.md)
