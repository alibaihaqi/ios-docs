---
title: Swift concurrency
tier: swift
platform: ios
---

# Swift concurrency

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Swift concurrency

**Goal**

You will write `async` functions, create tasks and task groups, define actors to protect state, use `@MainActor` for UI updates, and mark types `Sendable` for safe cross-concurrency passing. After this page you can write correct concurrent code in Swift — avoiding data races and thread explosion — without dropping down to raw GCD or `OSLock`.

**Prerequisites**

- [07 Generics](./07-generics.md)

## The problem concurrency solves

Before Swift concurrency (iOS 13+), concurrent code used Grand Central Dispatch (`DispatchQueue.main.async`, `DispatchQueue.global().async`) or `OperationQueue`. These patterns are manual, error-prone, and encourage thread explosion:

```swift
// GCD callback-hell pattern
func fetchUser(id: Int, completion: @escaping (Result<User, Error>) -> Void) {
    DispatchQueue.global().async {
        let url = URL(string: "https://api.example.com/users/\(id)")!
        let task = URLSession.shared.dataTask(with: url) { data, _, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }
            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(URLError(.badServerResponse))) }
                return
            }
            do {
                let user = try JSONDecoder().decode(User.self, from: data)
                DispatchQueue.main.async { completion(.success(user)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }
        task.resume()
    }
}
```

The problems: every callback must manually hop threads, errors are easily lost, and a missing `completion` call produces a silent hang. Swift concurrency replaces this with a linear, suspendible model enforced by the compiler.

## `async`/`await` — the model

A function marked `async` can suspend itself at `await` points, releasing its thread until the awaited work completes. The function does not block — it yields control cooperatively, and the runtime reschedules it when the result is ready:

```swift
func fetchUser(id: Int) async throws -> User {
    let url = URL(string: "https://api.example.com/users/\(id)")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}

// Call site — synchronous-looking, but suspension happens at await
let user = try await fetchUser(id: 42)
```

Every `await` is a **suspension point**. The compiler inserts them explicitly — you can see exactly where the function might pause. Inside an `async` function you can call other `async` functions with `await`:

```swift
func loadProfile(for id: Int) async throws -> Profile {
    let user = try await fetchUser(id: id)
    let posts = try await fetchPosts(for: id)
    return Profile(user: user, posts: posts)
}
```

The runtime desugars each `async` function into a **state machine** (a re-entrant closure with an internal enum tracking which `await` to resume at). This is similar to how C# `async` methods or JavaScript `async` functions work, but Swift's is stackless — the suspended state is a heap-allocated continuation, not a retained call stack.

### Contrast with GCD

| | `async`/`await` | GCD |
|---|---|---|
| Thread usage | Cooperative — same thread re-used across `await` points | Thread-per-block — can create hundreds of threads |
| Suspension | Compiler-inserted state machine | Manual `async` block boundaries |
| Cancellation | Built-in (task-level) | Manual (`DispatchWorkItem.cancel()`) |
| Priority | Task priority propagates automatically | Manual `qos` assignment |

GCD creates a new block (and potentially a new thread) for every unit of work. Swift concurrency reuses threads within a cooperative pool — the runtime maintains a small number of threads (roughly CPU count) and suspends/resumes tasks on them. This prevents thread explosion, the leading cause of iOS crashes from GCD-heavy code.

## Tasks and structured concurrency

A **task** is a unit of asynchronous work. Every `async` function runs inside a task. Tasks form a tree: a parent task creates child tasks, and the parent waits for all children before it completes.

### `Task { }` — creating a child task

`Task { }` creates a child task in the current context. Use it to call `async` code from a synchronous context (like a SwiftUI button handler):

```swift
func handleTap() {
    Task {                         // creates a new child task
        let user = try await fetchUser(id: 42)
        await updateUI(user)
    }
    // handleTap returns immediately — the task runs concurrently
}
```

The task inherits its priority and actuator from the current context. If called on the main thread, the task's body also runs on `@MainActor` by default.

### `Task.detached { }` — unstructured task

A detached task has no parent, inherits no priority, and is not automatically cancelled:

```swift
Task.detached {
    let user = try await fetchUser(id: 42)
    await MainActor.run {
        updateUI(user)
    }
}
```

Use `Task.detached` only when you need a fire-and-forget operation that outlives the current scope — for example, background analytics upload that must continue even after the view that started it disappears. In most code, prefer `Task { }`.

### Structured concurrency

The rule: **every task must have a parent**. A parent task suspends at the end of its scope until all child tasks complete. This is called *structured concurrency* — the task tree mirrors the code's lexical structure:

```swift
func loadData() async {
    // Parent task scope
    async let user = fetchUser(id: 42)       // child task 1
    async let posts = fetchPosts(for: 42)    // child task 2

    // Both children must complete before loadData returns
    let (loadedUser, loadedPosts) = await (user, posts)
    // use loadedUser, loadedPosts
}
```

`async let` creates a child task whose result is awaited at the next `await` point. If `loadData()` is cancelled, both children are automatically cancelled too.

### `TaskGroup` — dynamic child tasks

When the number of child tasks is not known at compile time (e.g., a collection), use `withTaskGroup`:

```swift
func fetchAllUsers(ids: [Int]) async throws -> [User] {
    try await withTaskGroup(of: User.self) { group in
        for id in ids {
            group.addTask {
                try await fetchUser(id: id)
            }
        }

        var results: [User] = []
        for try await user in group {
            results.append(user)
        }
        return results
    }
}
```

Each `group.addTask` spawns a child task. The `for try await user in group` loop collects results as they finish — possibly out of order — and the group as a whole completes only when all children have finished.

`withThrowingTaskGroup` is the throwing variant (child tasks can throw). `withDiscardingTaskGroup` (Swift 5.9+) avoids accumulating results when you don't need them — useful for streaming or fire-and-forget child tasks.

### Returning values from a task

`Task { }` returns a `Task<T, Error>` — call `.value` to await the result:

```swift
let task = Task { () -> User in
    try await fetchUser(id: 42)
}
let user = try await task.value   // waits for the task to complete
```

The `Task` itself is an `Identifiable` handle — you can store it, cancel it later, or check its `isCancelled` property.

### Cancellation

Every task carries a cancellation flag. The flag is set automatically when a parent task is cancelled (structured concurrency propagation). Check it explicitly:

```swift
func process() async {
    guard !Task.isCancelled else { return }

    for item in items {
        try Task.checkCancellation()   // throws CancellationError if cancelled
        await process(item)
    }
}
```

- `Task.isCancelled` — check without throwing.
- `Task.checkCancellation()` — throws `CancellationError` if cancelled, making it easy to exit early from a throwing function.
- `Task.withTaskCancellationHandler(operation:onCancel:)` — attach a side effect (e.g., close a file handle) when cancellation occurs.

## Actors

An **actor** protects its mutable state by serializing access. All access to an actor's stored properties goes through a single execution queue — the actor's executor. This is the concurrency-safe replacement for a mutex or serial dispatch queue:

```swift
actor Counter {
    var count = 0

    func increment() {
        count += 1                     // safe — we are inside the actor
    }

    func getCount() -> Int {
        count
    }
}

let counter = Counter()
Task {
    await counter.increment()          // await required — crossing actor boundary
    let value = await counter.getCount()
    print(value)
}
```

Every call from *outside* the actor requires `await`. Inside the actor, the properties are directly accessible — the compiler knows the code is running on the actor's executor.

### The `await` requirement

When you call `counter.increment()` from outside, the calling task must suspend if the actor is currently busy on another call. The `await` marks this potential suspension point:

```swift
Task {
    await counter.increment()   // may suspend if another task is inside the actor
}
```

If two tasks call `counter.increment()` concurrently, the actor serializes them: one runs immediately, the other suspends and runs after the first completes.

### Non-reentrancy

Actors are **non-reentrant**: if an actor method calls `await` (suspends), the actor does not process new incoming calls until the current call completes. This prevents a class of reentrancy bugs that mutex-based code is vulnerable to:

```swift
actor BankAccount {
    var balance = 100

    func transfer(amount: Int, to other: BankAccount) async {
        balance -= amount
        // Suspension point — no other call can touch balance
        await other.deposit(amount: amount)
        // balance is still correct here because no other call interleaved
    }

    func deposit(amount: Int) {
        balance += amount
    }
}
```

Non-reentrancy is a safety guarantee: while an actor suspends at an `await`, its state is frozen — no other code can observe partial updates.

### `nonisolated` and `nonisolated(unsafe)`

A method that doesn't access actor state can be marked `nonisolated`, removing the `await` requirement at the call site:

```swift
actor Logger {
    var logFile: URL?

    nonisolated func format(_ message: String) -> String {
        "[LOG] \(message)"                       // no access to actor state
    }

    func write(_ message: String) {
        logFile = URL(fileURLWithPath: "/tmp/log.txt")   // needs isolation
    }
}

let logger = Logger()
let formatted = logger.format("hello")            // no await — nonisolated
await logger.write(formatted)                     // await — crossing actor boundary
```

`nonisolated(unsafe)` skips the compiler check entirely — use it only when you manually guarantee thread safety (e.g., a lock inside the method).

## `@MainActor`

`@MainActor` is a global actor that executes all its code on the main dispatch queue. It replaces `DispatchQueue.main.async` with a compiler-checked annotation:

```swift
@MainActor
class ViewModel: ObservableObject {
    @Published var name = ""

    func updateUI() {
        // This runs on the main thread — guaranteed by @MainActor
        name = "Alice"
    }
}

// Calling from a non-main-actor context:
Task {
    await viewModel.updateUI()   // await required — crossing to MainActor
}
```

`@MainActor` can be applied at multiple levels:

```swift
// Type-level — every method and property is on MainActor
@MainActor
class UserViewModel {
    var name: String = ""
}

// Function-level — just this function
@MainActor
func updateUI() { }

// Property-level — just this property
@MainActor var cachedName: String = ""

// Closure-level
Task { @MainActor in
    // runs on main thread
}
```

The global `MainActor.shared` is a singleton `MainActor` instance. You can also call `await MainActor.run { … }` to hop to the main actor from a non-actor context:

```swift
await MainActor.run {
    self.label.text = "Updated"
}
```

The compiler enforces that main-actor-isolated code is only called from the main thread. If you call it from a `nonisolated` context, you need `await` — exactly like any actor boundary.

### Why it replaces `DispatchQueue.main.async`

Before Swift concurrency, every UIKit update required a manual hop:

```swift
DispatchQueue.main.async {
    self.label.text = "Updated"
}
```

The problem: nothing forced you to do this. You could update UI from a background thread and get silent corruption (or a crash in debug builds). `@MainActor` makes the hop a compile-time requirement — the function signature declares "I must run on the main thread," and the compiler checks every call site.

## `Sendable` and `@Sendable`

`Sendable` is a marker protocol — no requirements — that declares a type is safe to pass across concurrency boundaries:

```swift
struct User: Sendable {
    let id: Int
    let name: String
}

// Value types are implicitly Sendable
// Classes need explicit opt-in
```

### Automatic `Sendable` conformance

Value types whose stored properties are all `Sendable` are automatically `Sendable`:

```swift
struct Point: Sendable {       // implicit — stored properties (Double, Double) are Sendable
    let x: Double
    let y: Double
}

enum Result<T: Sendable>: Sendable {  // enum with associated values that are Sendable
    case success(T)
    case failure(Error)               // Error is not Sendable! This is a problem.
}
```

`Error` is not `Sendable`. Passing an error across concurrency boundaries requires wrapping it in a `Sendable`-conforming type or using `any Error & Sendable` (Swift 5.7+).

### Classes and `Sendable`

A class must be either:

1. **`final` with immutable stored properties** — all `let` properties that are `Sendable`:

```swift
final class ImmutableConfig: Sendable {
    let timeout: Int       // Int is Sendable
    let url: URL           // URL is Sendable
    init(timeout: Int, url: URL) {
        self.timeout = timeout
        self.url = url
    }
}
```

2. **`@unchecked Sendable`** — you promise it's safe, the compiler trusts you:

```swift
final class LockedCache: @unchecked Sendable {
    private let lock = NSLock()
    private var storage: [String: Any] = [:]

    func get(_ key: String) -> Any? {
        lock.withLock { storage[key] }
    }

    func set(_ key: String, _ value: Any) {
        lock.withLock { storage[key] = value }
    }
}
```

Use `@unchecked Sendable` sparingly — it disables compiler verification. Only use it when you have manual synchronization (lock, queue, atomic) that the compiler cannot reason about.

### `@Sendable` closures

A closure marked `@Sendable` must not capture mutable shared state:

```swift
func fetch(completion: @Sendable @escaping (Result<User, Error>) -> Void) {
    Task {
        let result = await Result { try await fetchUser(id: 42) }
        completion(result)            // safe — no mutable captures
    }
}

// This is rejected:
var counter = 0
fetch { result in
    counter += 1         // error: mutation of captured var 'counter' from @Sendable closure
}
```

The compiler checks that a `@Sendable` closure does not capture mutable variables, nonsendable types, or create potential data races. This is Swift's compile-time answer to "did you forget to synchronize?"

## `AsyncSequence` and `AsyncStream`

An `AsyncSequence` is the asynchronous equivalent of `Sequence` — it produces values over time, consumed with `for await`:

```swift
let notifications = NotificationCenter.default
    .notifications(named: .userSignedIn)
    .map { $0.userInfo }

for await info in notifications {
    // called each time the notification fires
    processUserInfo(info)
}
```

`AsyncStream` is a concrete type for producing an asynchronous sequence manually:

```swift
let stream = AsyncStream<Int> { continuation in
    Task {
        for i in 1...10 {
            continuation.yield(i)
            try await Task.sleep(for: .seconds(1))
        }
        continuation.finish()
    }
}

for await value in stream {
    print(value)   // 1, 2, 3, … 10, one per second
}
```

`AsyncStream` supports buffering, cancellation (`continuation.onTermination`), and functional transforms (`map`, `filter`, `compactMap`). It's the async equivalent of a `Publisher` in Combine, built into the language with no framework dependency.

> **Usage note:** For making async network calls with `URLSession`, see [Intermediate tier page 03](../intermediate/03-async-urlsession.md). This page covers the language model behind it.

## Comparison with Objective-C

| | Swift concurrency | Objective-C |
|---|---|---|
| Async model | `async`/`await` (state machine) | Blocks + dispatch queues |
| Thread management | Cooperative pool | Manual queue creation |
| State protection | Actors (serialized access) | `@synchronized`, `NSLock`, serial queues |
| UI thread | `@MainActor` (compiler-checked) | `dispatch_async(dispatch_get_main_queue(), …)` |
| Data race prevention | `Sendable` (compile-time) | Manual convention only |
| Cancellation | Task cancellation (propagated) | `[operation cancel]` or `dispatch_block_cancel` |
| Value streams | `AsyncSequence` / `AsyncStream` | Delegate callbacks or KVO |

Objective-C has no language-level concurrency model beyond GCD blocks and `NSOperation`. Actors, `Sendable`, and structured concurrency are all Swift-exclusive. The equivalent of a Swift actor in ObjC is a class with a serial dispatch queue or a `pthread_mutex_t` — manually managed and error-prone.

## What's next

You can now write safe concurrent code with `async`/`await`, protect state with actors, annotate main-thread boundaries with `@MainActor`, and verify cross-concurrency safety with `Sendable`. The next page covers Swift Package Manager — how to structure code into modules, declare dependencies, and publish libraries.

**Next** → [Swift Package Manager](./11-swift-package-manager.md)
