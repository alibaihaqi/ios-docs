---
title: Types and optionals
tier: swift
platform: ios
---

# Types and optionals

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Types and optionals

**Goal**

You will understand the value-vs-reference distinction that underpins all of Swift, know that `Optional` is just an enum the compiler sugar-coats, and be fluent in every way Swift unwraps an optional — `if let`, `guard let`, `??`, `?.`, and `try?`. After this page you can read any line that contains a `?` or a `!` and explain exactly what it does.

**Prerequisites**

- [01 Why Swift](./01-why-swift.md)

## Value types vs reference types

Every Swift type is either a **value type** or a **reference type**. This is the single most important distinction in the language; it determines what happens on assignment, what happens when you pass a value to a function, and how the type interacts with concurrency.

- **Value types** (`struct`, `enum`, tuple) — assignment *copies*. Each variable holds an independent value. Mutating one does not affect the other.
- **Reference types** (`class`) — assignment *shares*. Each variable holds a reference to the same instance. Mutating through one reference is visible through the other.

```swift
// Value type — copy on assignment
struct Point {
    var x: Int
    var y: Int
}

var a = Point(x: 1, y: 2)
var b = a          // b gets an independent copy
b.x = 99
print(a.x)         // 1  — a is untouched
print(b.x)         // 99

// Reference type — share on assignment
class Box {
    var value: Int
    init(value: Int) { self.value = value }
}

let p = Box(value: 1)
let q = p          // q points at the same instance as p
q.value = 99
print(p.value)     // 99  — p sees the change, because p and q are the same object
```

Notice `let p = Box(...)` is a `let`, yet `p.value = 99` compiles. `let` on a reference constant fixes the *reference* (you cannot reassign `p` to a new `Box`), but the object it points at is still mutable. `let` on a value type fixes the value itself — `let a = Point(...)` makes `a.x = 99` a compile error.

The standard-library collections are value types:

```swift
var original = [1, 2, 3]
var copy = original
copy.append(4)
print(original)    // [1, 2, 3]  — original unchanged
print(copy)        // [1, 2, 3, 4]
```

This is the behavior ObjC developers had to *defend against* with `@property (copy)` on `NSArray`. In Swift it is the default and the compiler enforces it. See [page 04](./04-structs-and-classes.md) for the full struct-vs-class decision.

## Optional: the enum behind the `?`

An optional is a value that is either "there" or "absent." In Swift, absence is not `nil`-the-pointer; it is a real value of a real type. `Optional` is an enum, defined in the standard library:

```swift
enum Optional<Wrapped> {
    case none
    case some(Wrapped)
}
```

The `?` is syntactic sugar. These two declarations are identical:

```swift
let maybeName: String? = "Mei"
let maybeName2: Optional<String> = .some("Mei")
```

And these are identical:

```swift
let absent: String? = nil
let absent2: Optional<String> = .none
```

`nil` in Swift is not a null pointer. It is the `.none` case of whatever `Optional` type the compiler inferred. A `String` (no `?`) genuinely cannot hold `nil` — there is no `.none` case, so the compiler rejects the assignment. This is why Swift has no `NullPointerException`: the type system makes "might be absent" a visible, checkable property of the type, not a runtime surprise.

## Why optionals exist

The pre-Swift world paid for null safety at runtime. In Objective-C, messaging `nil` returns `nil`/`0`/`NO` silently — convenient, but it hides bugs: a typo'd outlet stays `nil`, the message no-ops, and you spend an hour wondering why a button does nothing. In Java/C#, dereferencing `null` throws at runtime. Both defer the failure.

Swift's bet: **make absence a compile-time property**. If a function might not have a value to return, its return type says `String?`, and the caller *cannot* use the result as a `String` without unwrapping it. The compiler refuses to compile the unsafe path. You pay one unwrap at the call site; you never pay a runtime crash for a forgotten null check.

## Optional binding

To use the value inside an optional, you unwrap it. The safe ways all *bind* the wrapped value to a new constant only if it is present.

### `if let` — conditional unwrap

```swift
let user: String? = fetchUser()

if let name = user {
    // name is String here, not String?
    print("Hello, \(name)")
} else {
    print("No user")
}
```

`if let name = user` reads "if `user` has a value, bind it to `name` and run the if branch; otherwise run the else branch." `name` is a `String` inside the braces — the compiler narrowed the type.

You can shadow the original name, which is the common style:

```swift
if let user = user {
    print(user)   // user is now String inside the block
}
```

### `guard let` — early exit

`guard` is the inverse: unwrap or leave. It pushes the happy path to the top level of the function and the failure path out of the way.

```swift
func greet(_ user: String?) {
    guard let name = user else {
        print("No user")
        return
    }
    // name is String for the rest of the function
    print("Hello, \(name)")
}
```

`guard let` *requires* an `else` that exits the scope (`return`, `throw`, `break`, `continue`, or a call to a `Never`-returning function like `fatalError`). You cannot fall through. The bound constant (`name`) is available *after* the guard, in the rest of the function — that is the whole point.

### Multiple bindings and conditions

You can bind several optionals and add boolean conditions in one `if` / `guard`, separated by commas:

```swift
if let first = optionalA, let second = optionalB, first < second {
    print("\(first) < \(second)")
}

guard let id = user?.id, !id.isEmpty else {
    return
}
```

::: tip The comma replaced `where`
In Swift 2 you wrote `if let a = x where a > 0`. Swift 3 (SE-0099) replaced the `where` keyword with a comma, so the modern form is `if let a = x, a > 0`. The `where` keyword survives on `for` loops (`for i in 1...10 where i.isMultiple(of: 2)`) and on generic constraints (`func f<T>(_ x: T) where T: Comparable`), but not on `if` / `guard` conditions.
:::

## Nil-coalescing

`??` unwraps an optional, substituting a default if it is `nil`:

```swift
let user: String? = nil
let name = user ?? "Unknown"   // "Unknown"
```

`name` is a `String`, not a `String?` — `??` always produces a non-optional. You can chain defaults:

```swift
let display = savedName ?? configuredName ?? "Guest"
```

The right-hand side is only evaluated if the left is `nil`, so `??` is short-circuiting and safe to use with expensive defaults.

## Optional chaining

`?.` calls a property or method only if the receiver is non-`nil`; otherwise the whole expression short-circuits to `nil`. The result type is always optional.

```swift
struct User {
    var address: Address?
}

struct Address {
    var city: String?
}

let user: User? = fetchUser()
let city = user?.address?.city?.uppercased()   // String?
```

Each `?` is an unwrap-or-short-circuit. If `user` is `nil`, the whole chain is `nil` and nothing after `user?` runs. If `user` exists but `address` is `nil`, same. Only if every link is non-`nil` do you get `.some(uppercased city)`.

This replaces the ObjC pattern of messaging `nil` and getting `nil` back — but with the crucial difference that the *type* tells you the result might be absent. `city` is `String?`, so the compiler will make you handle `nil` before using it.

Optional chaining also works on calls:

```swift
user?.save()   // calls save() only if user != nil; returns Void? (optional tuple)
```

## `try?` — convert a throw to an optional

`try?` runs a throwing expression and turns the result into an optional: success becomes `.some(value)`, a thrown error becomes `.none`.

```swift
func parse(_ s: String) throws -> Int { /* ... */ }

let n = try? parse("42")   // Int? — .some(42) or .none on throw
```

Combined with `??` this is a clean "or default" pattern:

```swift
let count = (try? parse(input)) ?? 0
```

There is also `try!` — unwrap the result, crash on throw. Reserve it for cases where a throw is genuinely a programmer error (e.g. a hardcoded regex literal you know compiles). In most code, prefer `try?` or a real `do`/`catch`.

## Implicitly unwrapped optionals

`!` instead of `?` declares an **implicitly unwrapped optional** (IUO). It is still an `Optional` under the hood, but the compiler auto-unwraps it on every use, crashing if it is `nil`.

```swift
let name: String! = "Mei"
print(name)         // "Mei" — auto-unwrapped, no `!` needed at use site
print(name.count)   // 3
```

IUOs exist for one historical reason: **migration from Objective-C**. Pre-Swift-5 ObjC headers declared properties as non-null in places the importer could not prove it, and the importer produced `String!` so the migrated code would compile without an unwrap on every access. They were a pragmatic bridge, not a feature to reach for.

In modern Swift, **avoid IUOs.** Use a non-optional with a real default, or a `String?` with an explicit unwrap at the point of use. The compiler has been steadily tightening IUO semantics since Swift 4 — what was once "auto-unwrap, mostly safe" is now treated much closer to a regular optional. If you find yourself writing `!` on a property declaration, ask whether the value is really always present (then make it non-optional) or really sometimes absent (then make it `?`).

## Type inference vs explicit annotations

Swift infers types aggressively. Most of the time you can omit them:

```swift
let name = "Mei"            // String
let age = 30                // Int
let pi = 3.14159            // Double
let scores = [90, 85, 70]   // [Int]
let pairs: [String: Int] = [:]
```

When to annotate explicitly:

- **When the literal is ambiguous.** `let x = 3` is `Int`; if you need `Double` write `let x: Double = 3` (or `let x = 3.0`).
- **When the type is a protocol you want to program against.** `let items: any Collection = [1, 2, 3]` — the inferred type would be `[Int]`, a concrete type.
- **On function signatures.** Always annotate parameters and return types — Swift requires it, and it is the contract.
- **When inference would pick the wrong optional.** `let value = try? parse(input)` infers `Int?`; usually fine, but annotate if you want `Int??` behavior is never what you want.

A useful rule: *annotate at API boundaries, infer inside function bodies.* The compiler is better at this than you are; fighting it with redundant annotations adds noise without safety.

## Practical examples

### Parsing JSON with `Codable`

```swift
struct User: Codable {
    let id: Int
    let name: String
    let nickname: String?      // may be absent in the JSON
}

let json = """
{"id": 1, "name": "Mei"}
""".data(using: .utf8)!

let user = try? JSONDecoder().decode(User.self, from: json)
// user is User? — decode may throw

if let user = user {
    print(user.name)                    // "Mei"
    print(user.nickname ?? "no nick")   // "no nick"
}
```

Every layer that can fail is reflected in the type: `decode` returns `User` but `throws`, so `try?` makes it `User?`; `nickname` is `String?` because the JSON might omit it; `??` provides a default at the use site. Nothing here can crash on a missing value.

### A network response

```swift
struct ApiResponse {
    let data: [String]?
    let errorMessage: String?
}

func handle(_ response: ApiResponse) {
    guard let rows = response.data, !rows.isEmpty else {
        // errorMessage is String? — unwrap only if data was absent
        let reason = response.errorMessage ?? "unknown error"
        showError(reason)
        return
    }
    // rows is [String], non-empty, for the rest of the function
    render(rows)
}
```

The shape of the types encodes the rules: `data` and `errorMessage` are both optional because either might be absent; the `guard` says "I need data, and if I don't have it I need to surface a reason." The compiler guarantees every optional is handled before use.

## What's next

You can now read optional-heavy Swift. The next page covers the other thing that makes Swift read differently from ObjC: functions with argument labels, default values, `inout`, and closures — including the trailing-closure syntax and capture lists that make SwiftUI possible.

**Next** → [Functions and closures](./03-functions-and-closures.md)
