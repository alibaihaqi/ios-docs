---
title: Functions and closures
tier: swift
platform: ios
---

# Functions and closures

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Functions and closures

**Goal**

You will write Swift functions with argument labels, default values, variadics, and `inout` parameters, and you will understand closures — full syntax, trailing closures, multiple trailing closures, shorthand arguments, capture lists, and `@escaping`. After this page you can read any closure you find in a SwiftUI codebase and know what every token does.

**Prerequisites**

- [02 Types and optionals](./02-types-and-optionals.md)

## Function declaration

A Swift function is declared with `func`, a name, a parameter list, a return type, and a body:

```swift
func greet(name: String) -> String {
    return "Hello, \(name)"
}

greet(name: "Mei")   // "Hello, Mei"
```

The arrow `-> ReturnType` is required when the function returns a value. A function with no return value omits it (the return type is `Void`, which is `()`):

```swift
func log(_ message: String) {
    print(message)
}
```

## Argument labels vs parameter names

Every function parameter has *two* names: an **argument label** (used at the call site) and a **parameter name** (used inside the body). When you write only one name, it serves as both.

```swift
// One name — label and parameter are the same
func greet(name: String) -> String {
    return "Hello, \(name)"     // 'name' is the parameter
}
greet(name: "Mei")              // 'name' is the label

// Two names — explicit label + parameter
func greet(person name: String) -> String {
    return "Hello, \(name)"     // 'name' is the parameter
}
greet(person: "Mei")            // 'person' is the label

// Omitted label — `_`
func greet(_ name: String) -> String {
    return "Hello, \(name)"
}
greet("Mei")                    // no label at the call site
```

Swift's [API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/) say a call site should read like English prose. The label is the user-facing word; the parameter name is the implementation word. The guidelines:

- **Omit the label** (`_`) when the argument would read redundantly: `greet("Mei")`, not `greet(name: "Mei")`. The function already says "greet."
- **Use a label** when it clarifies the call: `log("started", level: .info)`, `fade(out: 0.3)`, `insert(_, at: 0)`. The preposition (`at`, `into`, `with`) makes the call site self-documenting.
- **Use distinct label and parameter names** when the natural call-site word is awkward inside the body: `func count(for user: User)` reads well at the call site, but `user` is clearer than `for` inside the function.

### Default values

A parameter can have a default; callers that omit it get the default:

```swift
enum LogLevel { case debug, info, warn, error }

func log(_ message: String, level: LogLevel = .info) {
    print("[\(level)] \(message)")
}

log("started")                 // uses default: .info
log("disk full", level: .error)
```

Parameters with defaults must come after parameters without defaults. This is a hard rule, not a style preference — the call-site syntax would be ambiguous otherwise.

### Variadic parameters

A variadic parameter accepts zero or more values, collected into an array inside the body:

```swift
func sum(_ numbers: Int...) -> Int {
    var total = 0
    for n in numbers { total += n }
    return total
}

sum()              // 0
sum(1, 2, 3)       // 6
sum(1, 2, 3, 4, 5) // 15
```

`numbers` has type `[Int]` inside the function. A function can have at most one variadic parameter. Variadics are convenient for literals; for large arrays, pass `[Int]` directly.

### `inout` — modify a value-type argument in place

Value types copy on assignment, so a function normally gets its own copy of a `struct` argument and cannot affect the caller's copy. `inout` lets a function *mutate* the caller's variable directly, passed by reference:

```swift
func increment(_ n: inout Int) {
    n += 1
}

var count = 5
increment(&count)
print(count)   // 6
```

The caller marks the argument with `&`. Inside the function, `n` is a regular `Int` you can read and assign. The compiler enforces **exclusive access** (SE-0176): while `increment` is running, nothing else can read or write `count`. This is what makes `inout` safe where C pointers are not — there is no aliasing.

`inout` is the standard-library swap (`swap(&a, &b)`), the mutating-collection machinery, and the low-level escape hatch for "I need to change the caller's value type." It is not for sharing long-lived references — for that, use a `class`.

## Return types

### Single value

```swift
func square(_ x: Int) -> Int { x * x }
```

A function whose body is a single expression can omit `return` (implicit return, Swift 5.1+).

### Tuple — multiple return values

```swift
func minMax(_ array: [Int]) -> (min: Int, max: Int)? {
    guard let first = array.first else { return nil }
    var lo = first, hi = first
    for n in array.dropFirst() {
        if n < lo { lo = n }
        if n > hi { hi = n }
    }
    return (lo, hi)
}

if let r = minMax([3, 1, 4, 1, 5, 9]) {
    print(r.min, r.max)   // 1 9 — tuple elements are named
}
```

Tuple elements are named at the return type, so the caller uses `r.min` and `r.max` rather than `r.0` and `r.1`.

### `Never` — does not return

```swift
func crash(_ message: String) -> Never {
    fatalError(message)
}
```

`Never` is an enum with no cases. A function returning `Never` cannot produce a value, so the compiler knows it does not return — it must `fatalError`, `exit`, or loop forever. This lets `guard else { fatalError() }` type-check: the else branch "returns" `Never`, so the compiler does not require a value of the function's declared return type.

## Closures

A closure is an unnamed function. Syntactically it is a function without a `func` keyword, with the parameter list and return type before an `in`:

```swift
// Full syntax
let greet: (String) -> String = { (name: String) -> String in
    return "Hello, \(name)"
}
greet("Mei")
```

Closures are first-class — you can store them, pass them, and return them. The type of a closure is `(Params) -> ReturnType`. `() -> Void` is a closure taking no parameters and returning nothing.

### Trailing closure syntax

When a function's last parameter is a closure, you can write the closure *after* the call's parentheses, with no label:

```swift
let names = ["Mei", "Aarav", "Sam"]
let uppercased = names.map { (s: String) -> String in
    s.uppercased()
}
// uppercased == ["MEI", "AARAV", "SAM"]
```

The `{ ... }` after `map` is the trailing closure — it is the argument to `map`'s only closure parameter. Trailing-closure syntax is what makes Swift read declaratively; SwiftUI's view bodies are trailing closures of `ViewBuilder` functions.

### Multiple trailing closures (Swift 5.3+)

When a function takes more than one closure parameter, the first uses trailing-closure syntax (no label) and the rest use labeled trailing closures:

```swift
func animate(
    animations: () -> Void,
    completion: () -> Void
) {
    animations()
    completion()
}

animate {
    print("animating")
} completion: {
    print("done")
}
```

This is the syntax SwiftUI uses for `ImageView` builders, animated transitions, and any API that pairs a primary closure with secondary ones. Before 5.3 you had to label the first closure too, which broke the declarative reading.

### Shorthand arguments: `$0`, `$1`

Inside a closure, `$0`, `$1`, `$2`… refer to the parameters by position, so you can omit the parameter list and `in` entirely when the types are inferrable:

```swift
let uppercased = names.map { $0.uppercased() }

let sum = [1, 2, 3].reduce(0) { $0 + $1 }   // 6
```

`$0` is the first parameter, `$1` the second. Use this for short, obvious closures; for anything multi-line or non-obvious, name the parameters for readability.

### Capture lists

A closure *captures* the variables it references from the enclosing scope. By default it captures them strongly, which is how you get retain cycles:

```swift
class Networker {
    var onComplete: (() -> Void)?

    func start() {
        onComplete = {
            // 'self' is captured strongly — self holds onComplete,
            // onComplete holds self -> cycle. Leaks.
            self.handleDone()
        }
    }

    func handleDone() {}
}
```

The capture list goes first, in square brackets, before the parameter list (or before `in` if you omit the parameter list):

```swift
// weak — self becomes optional, nils out when the object deallocates
onComplete = { [weak self] in
    self?.handleDone()    // no-op if self is gone
}

// unowned — assumed non-nil; crashes if you use it after dealloc
onComplete = { [unowned self] in
    self.handleDone()     // crashes if self already deallocated
}

// capture a value by copy
let threshold = 10
let checker: (Int) -> Bool = { [threshold] value in
    value > threshold     // threshold is the value at capture time
}
```

When to use each:

- **`[weak self]`** — the default for closures stored long-term (completion handlers, delegates, async work). Safe: if `self` is gone, the closure no-ops. Cost: `self` becomes optional, so you write `self?.`.
- **`[unowned self]`** — when you can *guarantee* the closure's lifetime is bounded by `self`'s (e.g. a closure stored in a property of `self` itself). Avoids the optional unwrap, but a wrong guess is a crash.
- **`[capturedValue]`** — to snapshot a value at capture time, so later changes to the outer variable don't affect the closure. Default capture is by reference for `var`, by value for `let`.

### `@escaping` vs non-escaping

By default, a closure parameter is **non-escaping**: it must be called within the function's lifetime, and cannot be stored. This lets the compiler skip retain-counting and apply optimizations.

If you store the closure, or call it after the function returns (async, dispatch to a queue, save as a property), you must mark it `@escaping`:

```swift
class Cache {
    private var makers: [() -> String] = []

    func register(_ maker: @escaping () -> String) {
        makers.append(maker)        // stored — must be escaping
    }

    func run() {
        for m in makers { print(m()) }
    }
}
```

An `@escaping` closure may outlive the function call, so it captures its context strongly by default — which is why escaping closures so often need `[weak self]`. Non-escaping closures do not need a capture list: they are gone before `self` could be deallocated, so strong capture is safe.

## Practical example: network fetch

A throwing async function and two ways to call it:

```swift
func fetchUser(id: Int) async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: url(id))
    return try JSONDecoder().decode(User.self, from: data)
}
```

The completion-handler style (pre-async, still common in older APIs):

```swift
func fetchUser(id: Int, completion: @escaping (Result<User, Error>) -> Void) {
    URLSession.shared.dataTask(with: url(id)) { data, _, error in
        do {
            // URLSession hands you data (Data?) and error (Error?).
            // Guard the data, surface whichever failure caused its absence.
            guard let data = data else {
                throw error ?? URLError(.badServerResponse)
            }
            let user = try JSONDecoder().decode(User.self, from: data)
            completion(.success(user))
        } catch {
            completion(.failure(error))
        }
    }.resume()
}

// Call site — trailing closure
fetchUser(id: 42) { result in
    switch result {
    case .success(let user): print(user)
    case .failure(let err):  print(err)
    }
}
```

The `completion` closure is `@escaping` because `URLSession` stores it and calls it later, off the calling thread. The call site uses trailing-closure syntax — `fetchUser(id: 42) { result in ... }` reads as "fetch, then do this with the result." (The `dataTask` completion's own closure is *also* escaping, but the Swift importer marks C/ObjC-imported block parameters `@escaping` implicitly, so you never write the attribute there yourself.)

## Closures vs Objective-C blocks

Swift closures and ObjC blocks are interoperable — the Swift importer presents block parameters as closure parameters, and `@convention(block)` lets you pass a Swift closure where a C/ObjC block is expected. The differences:

| | Swift closure | Objective-C block |
|---|---|---|
| Syntax | `{ params -> Ret in body }` | `^(params){ body }` |
| Capture | Strong by default; `[weak self]` opt-out | `__strong` by default; `__weak`/`__unsafe_unretained` opt-out |
| Escaping | Non-escaping by default; `@escaping` to store | Always escaping (copied to the heap) |
| Type | `(Params) -> Ret` (first-class) | `Ret (^)(Params)` (C function pointer-like) |

See [Objective-C blocks](../objective-c/07-blocks.md) for the ObjC side. The mental model transfers directly: a block is a closure that is always escaping and always captures by reference unless you annotate.

## What's next

You can now write and read closures fluently. The next page takes the value-vs-reference distinction from [page 02](./02-types-and-optionals.md) and applies it to the two workhorses of Swift: `struct` and `class` — when to use each, how `mutating` works, what the memberwise initializer does, and why Apple says "use structures by default."

**Next** → [Structs and classes](./04-structs-and-classes.md)
