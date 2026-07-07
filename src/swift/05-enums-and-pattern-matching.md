---
title: Enums and pattern matching
tier: swift
platform: ios
---

# Enums and pattern matching

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Enums and pattern matching

**Goal**

You will define enums with raw values and associated values, switch over them with compiler-enforced exhaustiveness, use `@unknown default` for forward compatibility with framework enums, extract associated values with `if case` / `guard case` / `for case`, and build a state machine. After this page you can model a domain as a set of mutually exclusive states — each carrying exactly the data it needs — and know the compiler will flag every unhandled case.

**Prerequisites**

- [02 Types and optionals](./02-types-and-optionals.md)
- [04 Structs and classes](./04-structs-and-classes.md)

## Enums: cases, not constants

A Swift `enum` is a type with a fixed set of cases. The simplest form:

```swift
enum Direction {
    case north, south, east, west
}

let heading: Direction = .north     // '.north' — the leading dot infers the type
```

Each case is a first-class value of the enum type, not an integer. You pass `.north` around and the type system tracks it as a `Direction`. This already beats ObjC, where an enum is a named `NSInteger` constant and the compiler cannot stop you from assigning `42` to a `Direction` variable.

## Raw values

When each case needs a stable underlying value (for serialization, interop, or a lookup), give the enum a **raw value type**:

```swift
enum HTTPStatus: Int {
    case ok = 200
    case notFound = 404
    case serverError = 500
}

let status = HTTPStatus.notFound
print(status.rawValue)          // 404
```

Raw values must be unique within the enum and are all the same type (`Int`, `String`, `Character`, or any `RawRepresentable` type). For `Int` raw values, omitting the value auto-increments from the previous case; for `String`, omitting it uses the case name:

```swift
enum LogLevel: String {
    case debug        // rawValue "debug"
    case info         // rawValue "info"
    case error        // rawValue "error"
}

// Init from a raw value — returns nil if the value doesn't match a case
if let level = LogLevel(rawValue: "info") {
    print(level)      // LogLevel.info
}
LogLevel(rawValue: "trace")    // nil — no such case
```

The `init?(rawValue:)` failable initializer is synthesized for free whenever the enum has a raw value type.

## Associated values — the killer feature

Raw values are fixed at compile time; every `ok` case is always `200`. **Associated values** let each case *carry data at runtime* — different data per case, different types per case:

```swift
enum NetworkResult {
    case success(Data)
    case failure(Error)
    case redirect(URL)
}

let result: NetworkResult = .success(Data())
let other: NetworkResult = .failure(URLError(.timedOut))
```

Now `success` holds a `Data`, `failure` holds an `Error`, and `redirect` holds a `URL`. A single value of type `NetworkResult` can be any of these, carrying exactly the payload relevant to its state. This is the feature ObjC enums cannot express — an ObjC enum case is just an integer; there is no way to say "this case carries a URL."

You can also name the associated values for readability:

```swift
enum Barcode {
    case upc(Int, Int, Int, Int)
    case qrCode(String)
}

let product = Barcode.upc(8, 85909, 51226, 3)
```

## `switch` exhaustiveness

To read the data inside an enum, you `switch` over it. The compiler requires the switch to be **exhaustive** — every case must be handled, or a `default` must cover the rest:

```swift
func describe(_ result: NetworkResult) -> String {
    switch result {
    case .success(let data):
        return "Got \(data.count) bytes"
    case .failure(let error):
        return "Failed: \(error.localizedDescription)"
    case .redirect(let url):
        return "Redirected to \(url)"
    }
}
```

`let data` binds the associated value to a constant available inside that case's body. This is **pattern matching**: the switch both tests *which* case the value is and extracts its payload in one step.

The exhaustiveness check is a safety feature. If you later add a fourth case:

```swift
enum NetworkResult {
    case success(Data)
    case failure(Error)
    case redirect(URL)
    case cancelled        // new case
}
```

…every `switch` over `NetworkResult` without a `default` becomes a **compile error** until you handle `.cancelled`. The compiler walks every call site and tells you exactly where the new case is unhandled. In ObjC, adding an enum case silently falls through the `default` (or worse, the `switch` had no default and runs nothing) — the bug ships to users.

### Binding shorthand: `let` before the case

When every associated value is bound, you can hoist `let` to the case:

```swift
switch result {
case let .success(data):
    print(data)
case let .failure(error):
    print(error)
case let .redirect(url):
    print(url)
}
```

Both forms are identical; the hoisted `let` is idiomatic when all payloads are bound.

## `@unknown default` — forward compatibility

For enums defined in another module (Apple frameworks, a library), new cases may appear in a future version. A plain `default` swallows the new case silently — you'd never know it arrived. `@unknown default` handles the unknown case *and* produces a compiler warning when a new case exists that you didn't explicitly list:

```swift
switch UIDevice.current.userInterfaceIdiom {
case .phone:
    print("iPhone")
case .pad:
    print("iPad")
case .tv:
    print("Apple TV")
@unknown default:
    print("Unknown future device")
}
```

If Apple ships a new `.vision` case, your switch still compiles (the `@unknown default` catches it), but the compiler emits a warning: *"switch has been updated to handle unknown cases."* That warning is the signal to go add an explicit `.vision` case. Use `@unknown default` whenever you switch over an enum you don't own; use an exhaustive switch (no default) when you own the enum.

::: tip `@unknown default` requires a `default`-style catch-all
`@unknown default` is a modifier on `default` — it is not a standalone case. It was introduced in Swift 5.0 (SE-0192) and only makes sense for *non-frozen* enums (those without the `@frozen` attribute). On a frozen enum — your own enums in the same module are frozen by default — the compiler knows all cases, so `@unknown default` is a no-op. Reserve it for framework enums.
:::

## Pattern matching beyond `switch`

You don't always need a full switch. Swift has three one-case pattern matchers:

### `if case` — conditional extract

```swift
let state = DownloadState.loading(progress: 0.42)

if case .loading(let progress) = state {
    print("\(Int(progress * 100))% done")   // "42% done"
}
```

This reads "if `state` is `.loading`, bind its associated value to `progress` and run the block." It's a single-case switch with no exhaustiveness requirement — you handle one case and ignore the rest.

### `guard case` — early exit

```swift
func render(_ state: DownloadState) {
    guard case .completed(let data) = state else { return }
    // data is bound and non-optional for the rest of the function
    display(data)
}
```

Same logic as `if case`, but the bound value is available *after* the guard — useful when you only care about one case and want to bail on everything else.

### `for case` — filter a loop

```swift
let results: [NetworkResult] = [.success(Data()), .failure(URLError(.badURL)), .success(Data())]

for case .success(let data) in results {
    print("Received \(data.count) bytes")    // runs twice
}
```

`for case` iterates only the elements matching the pattern — a compact filter that also binds the associated value. The `.failure` element is skipped entirely.

## `CaseIterable`

Conforming to `CaseIterable` gives you a synthesized `allCases` array — every case in declaration order:

```swift
enum Direction: CaseIterable {
    case north, south, east, west
}

for direction in Direction.allCases {
    print(direction)    // north, south, east, west
}

print(Direction.allCases.count)    // 4
```

`CaseIterable` is synthesized only for enums **without** associated values (plain cases or raw values). An enum with associated values can't auto-conform because the compiler would need to fabricate payloads. You can conform manually by supplying your own `allCases`, but that's rare.

## `CustomStringConvertible`

By default, printing an enum shows the case (and for associated values, the payload). Conform to `CustomStringConvertible` to control the string representation:

```swift
enum HTTPStatus: Int, CustomStringConvertible {
    case ok = 200
    case notFound = 404
    case serverError = 500

    var description: String {
        switch self {
        case .ok:          return "200 OK"
        case .notFound:    return "404 Not Found"
        case .serverError: return "500 Internal Server Error"
        }
    }
}

print(HTTPStatus.notFound)    // "404 Not Found" (not "notFound")
```

`description` is used by `String(describing:)`, `print`, and debug logs. It's the standard way to give an enum a human-readable label.

## Complete example: a download state machine

A file download moves through mutually exclusive states, each carrying different data. An enum with associated values models this exactly:

```swift
import Foundation

enum DownloadState {
    case idle
    case loading(progress: Double)      // 0.0 ... 1.0
    case completed(Data)
    case failed(Error)
}

func handle(_ state: DownloadState) {
    switch state {
    case .idle:
        print("Waiting to start")

    case .loading(let progress):
        let pct = Int(progress * 100)
        print("Downloading… \(pct)%")

    case .completed(let data):
        print("Done — \(data.count) bytes received")

    case .failed(let error):
        print("Failed: \(error.localizedDescription)")
    }
}

var state: DownloadState = .idle
handle(state)            // "Waiting to start"

state = .loading(progress: 0.5)
handle(state)            // "Downloading… 50%"

state = .completed(Data(repeating: 0, count: 1024))
handle(state)            // "Done — 1024 bytes received"
```

Notice what the type system guarantees: you cannot read `data` from a `.loading` state, because the payload only exists inside the `.completed` case. In ObjC, you'd model this with an `NSInteger state` plus separate `progress`, `data`, and `error` properties — all of which exist simultaneously and must be manually kept consistent. The enum makes invalid states unrepresentable.

## Comparison with Objective-C

| | Swift | Objective-C |
|---|---|---|
| Enum cases | First-class values of the enum type | Named `NSInteger` constants |
| Payloads | Associated values (any type, per case) | None — integers only |
| Raw values | `Int`, `String`, etc., with `init?(rawValue:)` | The integer itself |
| Exhaustiveness | Compiler-enforced on every `switch` | `default` swallows new cases silently |
| Forward compat | `@unknown default` warns on new cases | No mechanism |
| Iteration | `CaseIterable.allCases` synthesized | None |

An ObjC enum is a set of `#define`-like integer constants. It has no associated values, no exhaustiveness checking, and no way to iterate its cases. Swift's enum is a full algebraic data type — the difference is not cosmetic; it changes how you model state.

## What's next

You can now model a domain as a closed set of states, each carrying its own data, with the compiler enforcing that every state is handled. The next page covers the feature that makes Swift *protocol-oriented*: protocols with default implementations, protocol extensions, and how they replace class-inheritance hierarchies.

**Next** → [Protocols and POP](./06-protocols-and-pop.md)
