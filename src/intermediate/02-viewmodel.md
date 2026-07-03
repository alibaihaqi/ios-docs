---
title: The view model
tier: intermediate
platform: ios
position: 2
---

# The view model

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Intermediate › The view model

**Goal**

You will define the `Post` model, the `LoadState` enum, and the `PostsViewModel`
class. After this page you have the reactive core that the rest of the tier's
views will observe.

**Prerequisites**

- [01 Why MVVM](./01-why-mvvm.md)

## The data model

Add a new Swift file to your project named `Post.swift`:

```swift
struct Post: Identifiable, Decodable {
    let id: Int
    let title: String
    let body: String
}
```

`Identifiable` lets `ForEach` and `List` key rows by `id`. `Decodable` lets
`JSONDecoder` convert the API response directly into an array of `Post` values
without any manual parsing.

## LoadState

The view needs to know which of three things is happening. An enum makes every
case explicit and exhaustive:

```swift
enum LoadState {
    case loading
    case loaded([Post])
    case failed(String)
}
```

- `.loading` — request is in flight; render a spinner.
- `.loaded([Post])` — data is ready; render the list.
- `.failed(String)` — something went wrong; render the error message with a
  retry button.

Add this to `Post.swift` below the `Post` struct, or in its own file.

## PostsViewModel

Add a new file `PostsViewModel.swift`:

```swift
import Foundation

@MainActor
final class PostsViewModel: ObservableObject {
    @Published var state: LoadState = .loading

    private let loader: PostsLoader
    init(loader: PostsLoader = PostsLoader()) { self.loader = loader }

    func load() async {
        state = .loading
        do {
            state = .loaded(try await loader.fetch())
        } catch {
            state = .failed(error.localizedDescription)
        }
    }
}
```

Read through the keywords:

- `@MainActor` — all mutations happen on the main thread. SwiftUI requires UI
  updates on the main thread; annotating the class removes the need for
  `DispatchQueue.main.async` call sites.
- `ObservableObject` — declares that this class can publish changes SwiftUI
  should react to.
- `@Published var state` — every time `state` is assigned, SwiftUI notifies all
  views observing this view model.
- `PostsLoader` is the network layer (page 03). The `init` takes it as a
  dependency so tests can inject a fake loader — the view model never constructs
  the loader directly in production calls except through the default argument.

## How state flows

```
load() called
    │
    ├── state = .loading  ──► view renders ProgressView
    │
    ├─ await loader.fetch()
    │       success
    │       └── state = .loaded(posts)  ──► view renders List
    │       failure
    │       └── state = .failed(message)  ──► view renders ErrorView
```

`PostsLoader` does not exist yet — the next page writes it.

**Next** → [03 Async load with URLSession](./03-async-urlsession.md)
