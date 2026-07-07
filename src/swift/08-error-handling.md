---
title: Error handling
tier: swift
platform: ios
---

# Error handling

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Error handling

**Goal**

You will define errors as types conforming to `Error`, throw and catch them, use `try` / `try?` / `try!` with a reason for each, chain operations on `Result`, and understand `rethrows`. After this page you can write a failure-aware function and know the compiler will not let a caller ignore the error path.

**Prerequisites**

- [05 Enums and pattern matching](./05-enums-and-pattern-matching.md)
- [07 Generics](./07-generics.md)

## Errors are types

Any type conforming to the `Error` protocol can be thrown. The `Error` protocol is a marker — it has no requirements — but in practice errors are almost always enums, because enums with associated values model "this thing went wrong, here are the details" perfectly:

```swift
enum NetworkError: Error {
    case invalidURL
    case timeout
    case serverError(statusCode: Int)
}
```

Each case is a distinct failure, and `serverError` carries the HTTP status code as an associated value. You can also use a struct (for a single error with rich data) or conform an existing type, but enums are the idiomatic form.

## Throwing

`throw` raises an error, immediately exiting the current function:

```swift
func fetch(url: URL) throws -> Data {
    guard url.scheme == "https" else {
        throw NetworkError.invalidURL
    }
    // ...
    return Data()
}
```

The `throws` keyword in the signature is the contract: this function *may* throw, and the compiler will not let a caller ignore that fact. A non-`throws` function cannot throw — the type system encodes "can fail" as a visible property of the function, just like `Optional` encodes "may be absent."

## `do`-`catch`

To call a throwing function, you use `try` inside a `do` block and catch errors in `catch` clauses:

```swift
do {
    let data = try fetch(url: url)
    process(data)
} catch NetworkError.timeout {
    print("Request timed out — retrying")
} catch NetworkError.serverError(let code) {
    print("Server returned \(code)")
} catch {
    // 'error' is the caught value, implicitly bound
    print("Unexpected error: \(error)")
}
```

The `catch` clauses pattern-match against the error, binding associated values (`let code`) just like a `switch`. The final `catch` with no pattern is the catch-all — it binds the error to the implicit `error` variable. The clauses are tried top to bottom, like `switch` cases, but unlike `switch` over an enum, a `catch` does not need to be exhaustive (you can ignore some errors and let them propagate).

### Error propagation

If your function calls a throwing function and doesn't catch, it must itself be `throws`:

```swift
func loadProfile(for user: String) throws -> Profile {
    let url = URL(string: "https://api.example.com/users/\(user)")!
    let data = try fetch(url: url)      // try: calls a throwing function
    return try decode(data)             // propagates if decode throws
}
```

`try` is mandatory at every throwing call site — there is no implicit throwing. The error bubbles up the call stack until a `do`-`catch` catches it, or it reaches `main` and crashes the program.

## `try?` — convert to optional

`try?` turns a throwing expression into an optional: success becomes `.some(value)`, a thrown error becomes `nil`:

```swift
let data = try? fetch(url: url)    // Data? — nil on throw
```

Combined with `??` this is a clean "or default" pattern:

```swift
let data = (try? fetch(url: url)) ?? Data()
```

Use `try?` when you don't care *which* error occurred — only whether it succeeded.

## `try!` — crash on failure

`try!` unwraps the result and crashes if the function throws. Reserve it for invariants you are certain about:

```swift
let regex = try! NSRegularExpression(pattern: "\\d+")   // hardcoded, known valid
```

In most code, prefer `try?` or a real `do`-`catch`. `try!` turns a recoverable error into a crash — fine for a known-good literal, dangerous for anything involving user input or the network.

## `Result<Success, Failure>`

`Result` is a type that represents either a success value or a failure error, as an enum rather than via the `throws` mechanism:

```swift
enum Result<Success, Failure: Error> {
    case success(Success)
    case failure(Failure)
}
```

A function that returns `Result` instead of `throws` hands the caller a value they can inspect synchronously, store, and pass around — without a `do`-`catch` at the call site:

```swift
func fetch(url: URL) -> Result<Data, NetworkError> {
    guard url.scheme == "https" else {
        return .failure(.invalidURL)
    }
    // ...
    return .success(Data())
}

switch fetch(url: url) {
case .success(let data):
    process(data)
case .failure(.invalidURL):
    print("Bad URL")
case .failure(.serverError(let code)):
    print("Server error \(code)")
}
```

Because `Result` is an enum, the `switch` is exhaustive — the compiler forces you to handle failure. This is why `Result` and `throws` are equivalent in expressive power but differ in ergonomics: `throws` is better for "call this and deal with it now"; `Result` is better for "store this outcome, pass it to a callback, or chain transforms on it."

### `map`, `flatMap`, `mapError`

`Result` has functional combinators for transforming its contents without unwrapping:

```swift
let result = fetch(url: url)          // Result<Data, NetworkError>

// map: transform the success value
let size: Result<Int, NetworkError> = result.map { $0.count }

// flatMap: transform with a closure that itself returns Result
let text: Result<String, NetworkError> = result.flatMap { data in
    guard let s = String(data: data, encoding: .utf8) else {
        return .failure(.serverError(statusCode: 500))
    }
    return .success(s)
}

// mapError: transform the failure type
let anyError: Result<Data, MyError> = result.mapError { MyError.from($0) }
```

- **`map`** — `(Success) -> NewSuccess` → `Result<NewSuccess, Failure>`. If the result was a failure, the failure passes through unchanged.
- **`flatMap`** — `(Success) -> Result<NewSuccess, Failure>` → `Result<NewSuccess, Failure>`. Use when the transform can itself fail (avoids nested `Result<Result<…>>`).
- **`mapError`** — `(Failure) -> NewFailure` → `Result<Success, NewFailure>`. Converts the error type, useful when unifying errors from different sources.

There is also `get()`, which extracts the success value or throws the failure — bridging `Result` back to the `throws` world:

```swift
do {
    let data = try fetch(url: url).get()    // throws on .failure
    process(data)
} catch {
    print(error)
}
```

And `Result(catching:)` (or `Result { try … }`), which wraps a throwing call into a `Result`:

```swift
let result = Result<Data, Error> { try fetch(url: url) }
```

## `rethrows`

A function marked `rethrows` only throws if its closure parameter throws. It cannot introduce errors of its own — it's a pure passthrough. This is how `Result.map` can be called with both throwing and non-throwing closures:

```swift
extension Result {
    func map<NewSuccess>(
        _ transform: (Success) throws -> NewSuccess
    ) rethrows -> Result<NewSuccess, Failure> {
        switch self {
        case .success(let value):
            return .success(try transform(value))   // throws only if transform throws
        case .failure(let error):
            return .failure(error)
        }
    }
}

// Non-throwing closure — no 'try' needed at the call site
let sizes = result.map { $0.count }

// Throwing closure — 'try' required
let parsed = try result.map { try JSONDecoder().decode(User.self, from: $0) }
```

The caller's experience adapts: pass a safe closure, no `try`; pass a throwing closure, `try` is required. The `rethrows` annotation is what makes the standard library's `map`, `filter`, and `compactMap` composable with both pure and throwing code.

## Practical example: a network layer with retry

Typed errors + `throws` + propagation make a retry loop that is both readable and compiler-checked:

```swift
import Foundation

enum NetworkError: Error {
    case invalidURL
    case timeout
    case serverError(statusCode: Int)
}

func fetch(url: URL) throws -> Data {
    guard url.scheme == "https" else {
        throw NetworkError.invalidURL
    }
    // In real code: URLSession synchronous or async
    // Simulate a failure for demo:
    throw NetworkError.timeout
}

func fetchWithRetry(url: URL, maxAttempts: Int = 3) throws -> Data {
    var lastError: Error?

    for attempt in 1...maxAttempts {
        do {
            return try fetch(url: url)
        } catch NetworkError.timeout {
            lastError = NetworkError.timeout
            print("Attempt \(attempt) timed out, retrying…")
            continue                    // retry only on timeout
        } catch NetworkError.serverError(let code) where code >= 500 {
            lastError = NetworkError.serverError(statusCode: code)
            print("Attempt \(attempt): server \(code), retrying…")
            continue                    // retry on 5xx
        } catch {
            throw error                 // don't retry other errors (invalidURL, 4xx)
        }
    }
    throw lastError ?? NetworkError.timeout
}

// Usage
do {
    let data = try fetchWithRetry(url: URL(string: "https://api.example.com")!)
    process(data)
} catch NetworkError.timeout {
    print("All retries exhausted — timed out")
} catch NetworkError.serverError(let code) {
    print("Server kept returning \(code)")
} catch {
    print("Failed: \(error)")
}
```

The `where` clause on the `catch` (`where code >= 500`) shows pattern matching with a boolean guard — retry only on 5xx server errors, not 4xx client errors. The error type flows through every layer: `fetch` throws `NetworkError`, `fetchWithRetry` propagates it, and the caller's `catch` clauses are checked against the same type.

## Comparison with Objective-C

| | Swift | Objective-C |
|---|---|---|
| Error representation | `Error`-conforming type (usually enum) | `NSError *` (a class) |
| Failure mechanism | `throw` / `throws` / `try` (compiler-enforced) | `NSError **` out-parameter (ignorable) |
| Caller must handle? | Yes — `try` is mandatory | No — you can pass `NULL` and ignore |
| Typed errors | Yes — `Result<Data, NetworkError>` | No — any `NSError` with a code/domain |
| Exhaustiveness | `switch` over `Result` is exhaustive | `if (error)` — nothing enforces handling |

In ObjC, the `NSError **` pattern is a pointer-to-pointer out-parameter:

```objc
NSError *error = nil;
NSData *data = [client fetchData:url error:&error];
if (error) {
    // handle — but nothing forced you to check
}
```

You can pass `NULL` for the error pointer and the error is silently discarded. The error is an `NSError` (a class with a `domain` string and `code` integer) — untyped relative to Swift's enum cases, and there's no exhaustiveness check. Swift makes "this can fail" a compile-time fact: the `throws` annotation, the mandatory `try`, and the exhaustive `switch` on `Result` together guarantee the error path is handled. See [ObjC page 09](../objective-c/09-error-handling.md) for the full ObjC error model.

## What's next

You can now write failure-aware code with the compiler enforcing that every error is handled — whether through `throws`/`catch` or `Result`. The next page goes under the hood of SwiftUI's syntax: property wrappers and result builders, the language features that turn `@State` and `VStack { … }` into real code.

**Next** → [Property wrappers and result builders](./09-property-wrappers-result-builders.md)
