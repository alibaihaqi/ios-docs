---
title: Why MVVM
tier: intermediate
platform: ios
position: 1
---

# Why MVVM

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Intermediate › Why MVVM

**Goal**

You will understand why mixing data and view logic in a single struct breaks down
as soon as you need to fetch data from the network. After this page you will
know the one-sentence definition of MVVM and why the rest of this tier uses it.

**Prerequisites**

- [Beginner tier](../beginner/)
- [ForEach and Identifiable](../beginner/10-foreach-and-identifiable.md)
- [Ship a one-screen list app](../beginner/11-ship-list-app.md)

## The beginner list has a problem

The beginner habit list stores data directly in the view:

```swift
struct ContentView: View {
    let habits: [Habit] = [ /* hard-coded */ ]
    ...
}
```

That works for static data. The moment the data must come from the network, the
view struct takes on three unrelated jobs:

1. **Fetch** — kick off a network request, retry on failure.
2. **Track state** — know whether loading is in progress, done, or failed.
3. **Render** — turn the current state into a visible layout.

Cramming all three into one struct produces code that is hard to read, impossible
to test in isolation, and brittle when the product adds a second screen that
needs the same posts.

## What MVVM does

**Model–View–ViewModel (MVVM)** is a pattern that assigns each job to one object:

| Layer | Responsibility | In this tier |
|---|---|---|
| **Model** | Data shape | `Post` struct |
| **ViewModel** | Fetch, state, business rules | `PostsViewModel` class |
| **View** | Render current state | `PostsView` struct |

The view owns zero data and no network logic. It subscribes to the view model
and re-renders whenever state changes. The view model knows nothing about the
UI — it just publishes state.

## Why a class, not a struct

SwiftUI views are structs because they are cheap to recreate on every render.
A view model lives *between* renders and must keep its state across them. Swift
classes have reference semantics — one instance, referenced everywhere — which
is exactly what you need for something that persists across view redraws.

Combined with `ObservableObject` and `@Published`, the class integrates into
SwiftUI's reactivity system: every view that observes the model re-renders the
moment a published property changes.

## One sentence

> The view model converts raw data and async side effects into a stream of simple
> state values the view can render without any logic of its own.

The next page defines the state type and writes the view model.

**Next** → [02 The view model](./02-viewmodel.md)
