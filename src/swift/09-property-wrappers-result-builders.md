---
title: Property wrappers and result builders
tier: swift
platform: ios
---

# Property wrappers and result builders

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Property wrappers and result builders

**Goal**

You will implement custom `@propertyWrapper` types and custom `@resultBuilder` types, understand what Swift expands them into, read their projected values, and recognize the protocol requirements they satisfy. After this page you understand the language machinery that SwiftUI's `@State`, `@Binding`, `@ViewBuilder`, and `@Observable` are built on — and can build your own equivalents for non-SwiftUI contexts.

**Prerequisites**

- [07 Generics](./07-generics.md)
- [08 Error handling](./08-error-handling.md)

## Property wrappers

A **property wrapper** is a type that manages access to a stored property. You apply it with `@WrapperName`, and the compiler desugars the declaration into a stored instance of the wrapper type with compiler-synthesized `get`/`set` accessors that forward to the wrapper's `wrappedValue`.

This is purely a language feature — it doesn't require SwiftUI, UIKit, or any framework. SwiftUI *uses* property wraxtures heavily, but the machinery is part of the language.

### The `@propertyWrapper` protocol

To make a type a property wrapper, mark it with `@propertyWrapper`. The protocol requires a `wrappedValue` property — at minimum a getter:

```swift
@propertyWrapper
struct Trimmed {
    private var value: String = ""

    var wrappedValue: String {
        get { value }
        set { value = newValue.trimmingCharacters(in: .whitespacesAndNewlines) }
    }
}
```

`wrappedValue` can be read/write (as above) or read-only. If the wrapper is meant to be used as a `let` property, provide only a getter.

### Desugaring

When you write:

```swift
struct User {
    @Trimmed var name: String
}
```

Swift desugars it to:

```swift
struct User {
    private var _name: Trimmed = Trimmed()
    var name: String {
        get { _name.wrappedValue }
        set { _name.wrappedValue = newValue }
    }
}
```

The stored property `_name` holds the wrapper instance. The public `name` property is computed — it reads and writes the wrapper's `wrappedValue`. There is no `@Trimmed` at runtime; it is purely a compile-time transformation.

### Initialization

The compiler synthesizes initialization calls based on the initializer you provide on the wrapper. Three patterns cover most uses:

**`init(wrappedValue:)` — default value forwarding**

If the wrapper declares `init(wrappedValue: T)`, the compiler forwards an initial value through it:

```swift
@propertyWrapper
struct Clamped<T: Comparable> {
    private var value: T
    private let min: T
    private let max: T

    init(wrappedValue: T, min: T, max: T) {
        self.value = min(max(wrappedValue, min), max)
        self.min = min
        self.max = max
    }

    var wrappedValue: T {
        get { value }
        set { value = min(max(newValue, min), max) }
    }
}

struct Settings {
    @Clamped(min: 0, max: 100) var volume: Double = 50.0
    // Desugars to: init(volume: Double = 50.0) {
    //                  self._volume = Clamped(wrappedValue: volume, min: 0, max: 100)
    //              }
}

var s = Settings()
print(s.volume)          // 50.0
s.volume = 200
print(s.volume)          // 100.0 — clamped to max
```

The compiler initializer synthesis works only when the property has a default value. Without one:

```swift
@Clamped(min: 0, max: 100) var volume: Double   // error: no initializer provided
// You must write: _volume = Clamped(wrappedValue: 0, min: 0, max: 100)
// but that requires Setings to have a custom init.
```

**`init()` — no initial value forwarding**

If the wrapper has an empty `init()`, every usage must initialize the wrapper explicitly:

```swift
@propertyWrapper
struct UserDefault<T> {
    private let key: String

    init(key: String) { self.key = key }

    var wrappedValue: T? {
        get { UserDefaults.standard.object(forKey: key) as? T }
        set { UserDefaults.standard.set(newValue, forKey: key) }
    }
}

@UserDefault(key: "launch_count") var launchCount: Int?
```

Here `init(wrappedValue:)` is absent, so the stored property `_launchCount` is initialized with `UserDefault(key: "launch_count")` — the initial value is not forwarded.

### Projected value

A property wrapper can expose additional functionality through a **projected value**, accessed with the `$` prefix. Define it as a `var projectedValue` on the wrapper:

```swift
@propertyWrapper
struct Flag {
    private var value: Bool = false

    var wrappedValue: Bool {
        get { value }
        set { value = newValue }
    }

    var projectedValue: Self { self }

    mutating func toggle() {
        value.toggle()
    }
}

struct FeatureFlags {
    @Flag var isDarkMode: Bool = false
}

var f = FeatureFlags()
print(f.isDarkMode)       // false
f.$isDarkMode.toggle()    // access the wrapper via $
print(f.isDarkMode)       // true
```

`$isDarkMode` has type `Flag` — the projected value type. In SwiftUI, `@Binding` projects itself as a `Binding<T>`:

```swift
@Binding var name: String
// $name → Binding<String>
```

The `$` syntax is syntactic sugar: `f.$isDarkMode` desugars to `f._isDarkMode` (the projected value property, not `wrappedValue`). Any type can serve as the projected value — the wrapper itself, a separate helper type, or a closure.

### Restrictions

Property wrappers have hard limits:

- **Cannot be applied to protocols or computed properties.** A wrapper needs a stored backing variable. Protocols have no storage; computed properties already manage their own accessors.
- **Cannot use two wrappers of the same type on the same enclosing type.** Two `@Clamped` properties in the same struct would both synthesize `_value` backing storage — but the desugaring uses the wrapper type name, causing a collision. Swift does not allow this. (The workaround is to wrap one of them in a named wrapper type with a different name.)
- **Cannot be used at global scope.** Property wrappers require an enclosing type (struct, class, enum). A top-level `@Trimmed var name = ""` is an error.

### The types a wrapper can be applied to

| Enclosing type | `mutating` available? | `nonmutating` setter? |
|---|---|---|
| `struct` | Yes — wrapper methods can mutate `self` | Yes, for read-only wrappers |
| `class` | Yes (always mutable in a class) | Not needed |
| `enum` | Yes | Yes |
| Global / local | No — only local variable scope (single function) | N/A |

Local property wrappers (inside a function body) are allowed:

```swift
func process() {
    @Trimmed var input = "  hello  "
    print(input)   // "hello"
}
```

### Building a custom `@Clamped` wrapper

The full `Clamped` example, usable in any value-type context:

```swift
@propertyWrapper
struct Clamped<T: Comparable> {
    private var value: T
    private let range: ClosedRange<T>

    init(wrappedValue: T, _ range: ClosedRange<T>) {
        self.value = Swift.min(Swift.max(wrappedValue, range.lowerBound), range.upperBound)
        self.range = range
    }

    var wrappedValue: T {
        get { value }
        set { value = Swift.min(Swift.max(newValue, range.lowerBound), range.upperBound) }
    }

    var projectedValue: Self { self }
}

struct Config {
    @Clamped(0.0...1.0) var opacity: Double = 0.5
    @Clamped(0...100) var volume: Int = 50
}

var c = Config()
c.opacity = 1.5
print(c.opacity)          // 1.0
print(c.$opacity.range)   // 0.0...1.0
```

`Clamped` is generic over `T: Comparable`, works on any comparable type (`Double`, `Int`, `Float`, etc.), and exposes its range through the projected value. SwiftUI's `@State` is implemented similarly under the hood — it stores the value in a heap-backed box and projects a `Binding`.

> **SwiftUI usage:** `@State`, `@Binding`, `@Observable`, `@Environment`, `@AppStorage` are all property wrappers. To use them *in an app*, see the Beginner tier pages 08–10. This page explains the mechanism *behind* them.

## Result builders

A **result builder** is a type that accumulates multiple expressions into a single composite value. You apply it with `@resultBuilder` and use it on a function parameter or closure to implicitly insert `buildBlock` calls between each expression.

### The `@resultBuilder` protocol

The minimal requirement is a static `buildBlock` method:

```swift
@resultBuilder
struct StringBuilder {
    static func buildBlock(_ components: String...) -> String {
        components.joined(separator: "\n")
    }
}
```

With `buildBlock`, the compiler transforms this:

```swift
func document(@StringBuilder parts: () -> String) -> String {
    parts()
}

let doc = document {
    "Line one"
    "Line two"
}
```

Into code equivalent to:

```swift
StringBuilder.buildBlock("Line one", "Line two")
```

Each expression in the closure becomes an argument to `buildBlock`. The result builder stitches them together.

### `buildOptional` — conditional content

An `if` statement inside a result-builder closure requires `buildOptional` (for `if` without `else`) or `buildEither(first:)`/`buildEither(second:)` (for `if`-`else`):

```swift
@resultBuilder
struct StringBuilder {
    static func buildBlock(_ components: String...) -> String {
        components.joined(separator: "\n")
    }

    static func buildOptional(_ component: String?) -> String {
        component ?? ""
    }
}

let hasTagline = true
let bio = document {
    "Name: Alice"
    if hasTagline {
        "Tagline: Building things"
    }
}
```

Without `buildOptional`, `if` inside a result-builder block is a compile error. The builder receives `nil` when the condition is false.

### `buildEither(first:)` / `buildEither(second:)` — branching

`if`-`else` requires branching support:

```swift
extension StringBuilder {
    static func buildEither(first component: String) -> String {
        component
    }

    static func buildEither(second component: String) -> String {
        component
    }
}

let showEmail = false
let info = document {
    "Name: Alice"
    if showEmail {
        "Email: alice@example.com"
    } else {
        "Email not shown"
    }
}
```

The compiler desugars the `if`-`else` into a call to either `buildEither(first:)` or `buildEither(second:)` at runtime, depending on the condition.

### `buildArray` — loops

To use `for`-`in` inside a result builder, implement `buildArray`:

```swift
extension StringBuilder {
    static func buildArray(_ components: [String]) -> String {
        components.joined(separator: "\n")
    }
}

let items = ["Apple", "Banana", "Cherry"]
let list = document {
    "Shopping list:"
    for item in items {
        "- \(item)"
    }
}
```

Each iteration's result is collected into an array and passed to `buildArray`. Without this method, loops are not allowed in result-builder closures.

### How `@ViewBuilder` works

SwiftUI's `@ViewBuilder` is the most widely used result builder. It conforms to the same protocol but its `buildBlock` is overloaded for different numbers of views (1 through 10), wrapping them in `TupleView`:

```swift
// Conceptual — the real implementation has static overloads for 1..10 views
extension ViewBuilder {
    static func buildBlock<C0, C1>(_ c0: C0, _ c1: C1) -> some View
        where C0: View, C1: View
    {
        TupleView((c0, c1))
    }
}
```

This is why a SwiftUI `VStack` can contain up to 10 children without nesting — beyond 10 you hit the limit and must use `Group` or `ForEach`. The result builder hides the tuple construction entirely:

```swift
// Without result builder:
VStack { TupleView((Text("A"), Text("B"), Text("C"))) }

// With @ViewBuilder:
VStack {
    Text("A")
    Text("B")
    Text("C")
}
```

### Custom HTML builder

A complete result builder for HTML generation:

```swift
@resultBuilder
struct HTMLBuilder {
    static func buildBlock(_ components: String...) -> String {
        components.joined(separator: "\n")
    }

    static func buildOptional(_ component: String?) -> String {
        component ?? ""
    }

    static func buildEither(first component: String) -> String {
        component
    }

    static func buildEither(second component: String) -> String {
        component
    }

    static func buildArray(_ components: [String]) -> String {
        components.joined(separator: "\n")
    }

    static func buildExpression(_ expression: String) -> String {
        expression
    }
}

func page(@HTMLBuilder content: () -> String) -> String {
    "<html>\n\(content())\n</html>"
}

let title = "Hello"
let articles = ["Article 1", "Article 2"]

let html = page {
    "<head><title>\(title)</title></head>"
    "<body>"
    for article in articles {
        "<p>\(article)</p>"
    }
    if articles.isEmpty {
        "<p>No articles</p>"
    }
    "</body>"
}

print(html)
// <html>
// <head><title>Hello</title></head>
// <body>
// <p>Article 1</p>
// <p>Article 2</p>
// </body>
// </html>
```

`buildExpression` allows you to customize how individual expressions are wrapped before being handed to `buildBlock`. Without it, the builder accepts the raw `String` from each expression directly.

### What `@main` is — and isn't

`@main` is **not** a result builder. It is an attribute that marks the app entry point — the type whose static `main()` method is called at launch:

```swift
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

The `@main` attribute tells the compiler "generate a `main` entry point that calls `MyApp.main()`." It appears alongside result builders (`WindowGroup { … }` uses `@SceneBuilder`, which is another result builder), but `@main` itself is a separate feature (SE-0281). It replaces the `main.swift` file or `@UIApplicationMain` / `@NSApplicationMain` from earlier Swift versions.

### Restrictions

- A result builder type must be marked with `@resultBuilder` before its declaration.
- The closure or function parameter marked with the builder attribute **must** return the builder's result type.
- Not all Swift statements are supported: `switch` (without exhaustive pattern matching per builder), `guard`, `defer`, and `return` are prohibited inside result-builder closures. Only the statements whose `build*` method is implemented are allowed.
- The compiler limits the arity of `buildBlock` overloads. SwiftUI stops at 10 views; custom builders can go higher but need explicit overloads.

### Comparison with Objective-C

| | Swift | Objective-C |
|---|---|---|
| Property wrappers | `@propertyWrapper` protocol, compiler-desugared | No equivalent — KVO or custom accessors manually |
| Result builders | `@resultBuilder` protocol, implicit `buildBlock` calls | No equivalent — manual `NSArray` concatenation |
| Entry point | `@main` attribute (SE-0281) | `int main(int argc, char * argv[])` or `UIApplicationMain()` |
| Code generation | Compiler synthesizes accessors and `build*` calls | No compile-time transformation |

ObjC has no language-level concept of property wrappers. The closest pattern is a custom `@property (readonly, getter=…)` with manual KVO or `_cmd` forwarding — all done by hand. Result builders are unique to Swift; ObjC builds string content with `stringByAppendingString:` or format strings.

## What's next

You can now implement custom `@propertyWrapper` and `@resultBuilder` types and understand what the compiler synthesizes from annotations like `@State` and `@ViewBuilder`. The next page covers Swift's concurrency model — `async`/`await`, tasks, actors, and `Sendable` — the language features that make networking, database access, and UI updates safe and readable.

**Next** → [Swift concurrency](./10-swift-concurrency.md)
