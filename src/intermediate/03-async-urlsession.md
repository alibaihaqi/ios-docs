---
title: Async load with URLSession
tier: intermediate
platform: ios
position: 3
---

# Async load with URLSession

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Intermediate › Async load with URLSession

**Goal**

You will write `PostsLoader` — the object that fetches posts over the network
using `URLSession` and `async/await`. After this page the view model from page
02 can call `loader.fetch()` and get back a `[Post]` or throw an error.

**Prerequisites**

- [02 The view model](./02-viewmodel.md)

## The loader

Add a new file `PostsLoader.swift`:

```swift
import Foundation

struct PostsLoader {
    // Public, keyless sample API — no auth, no secrets.
    private let url = URL(string: "https://jsonplaceholder.typicode.com/posts")!

    func fetch() async throws -> [Post] {
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode([Post].self, from: data)
    }
}
```

## What each line does

`URLSession.shared.data(from:)` is the async variant of the classic completion-
handler API. It suspends the current task while the request is in flight and
resumes with `(Data, URLResponse)` when the response arrives. The `try await`
unwraps both the network error (if the request itself fails) and the suspension
point.

The `guard` checks the HTTP status code. A 200 means the server returned the
resource. Anything else — 404, 500, redirect loops — throws
`URLError(.badServerResponse)`. The caller (`PostsViewModel.load()`) catches
this and transitions to `.failed`.

`JSONDecoder().decode([Post].self, from: data)` maps the JSON array to `[Post]`.
It works because `Post` is `Decodable` and its property names match the JSON
keys the API returns:

```json
[
  { "id": 1, "userId": 1, "title": "...", "body": "..." },
  ...
]
```

`JSONDecoder` ignores keys it has no matching property for (`userId` here), so
the struct only needs to declare the properties it cares about.

## No API key required

`jsonplaceholder.typicode.com` is a free, public, read-only fake REST API. No
registration, no token, no rate-limit header. This keeps the sample free of
credentials.

> **Rule for real projects:** never hard-code API keys, tokens, or credentials
> in source files. Store secrets in environment variables, Xcode configuration
> files, or a secrets manager — never in a file committed to version control.

## Run a quick smoke test in a playground (optional)

If you want to verify the loader independently before wiring it to the UI, paste
this into an Xcode Playground:

```swift
import Foundation

// (paste Post and PostsLoader here)

Task {
    let posts = try await PostsLoader().fetch()
    print("Loaded \(posts.count) posts")
    print(posts[0].title)
}
```

Expected output: `Loaded 100 posts` followed by the first post title.

**Next** → [04 Bind the view](./04-bind-view.md)
