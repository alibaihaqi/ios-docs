---
title: Protocols and POP
tier: swift
platform: ios
---

# Protocols and POP

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Protocols and POP

**Goal**

You will define protocols with methods and properties, provide default implementations through protocol extensions, compose protocols with `&`, distinguish `some` from `any`, constrain generics with protocols, and understand why `@objc` protocols exist for ObjC interop. After this page you can replace a class-inheritance hierarchy with a protocol + extensions and explain why that is more flexible.

**Prerequisites**

- [04 Structs and classes](./04-structs-and-classes.md)
- [05 Enums and pattern matching](./05-enums-and-pattern-matching.md)

## What protocol-oriented programming replaces

Class inheritance builds a hierarchy: a `Base` class defines behavior, subclasses override it, and you program against the base type. This works, but it forces a single line of descent — you can only inherit from one class — and it ties behavior to reference semantics (classes are shared, mutable, ARC-managed).

**Protocol-oriented programming (POP)** flips the model: define capabilities as protocols, provide default behavior through protocol extensions, and conform *any* type (struct, enum, or class) to them. You compose capabilities by conforming to multiple protocols instead of inheriting from a deep class tree. Apple introduced this at WWDC 2015 ("Protocol-Oriented Programming in Swift") and it has been the idiomatic Swift style since.

## Defining a protocol

A protocol is a contract — a list of requirements a conforming type must satisfy. It declares methods and properties but provides no storage:

```swift
protocol Drawable {
    func draw()
}

protocol Named {
    var name: String { get }           // readable (let or var)
    var nickname: String? { get set }  // readable and writable (var only)
}
```

Property requirements use `{ get }` (read-only) or `{ get set }` (read-write). A `{ get set }` requirement means the conforming property must be a `var`; a `{ get }` requirement accepts either a `let` or a `var`.

## Protocol inheritance

A protocol can inherit from one or more other protocols. A conforming type must then satisfy the entire chain:

```swift
protocol Vehicle: Named {
    var speed: Double { get set }
    func accelerate(by amount: Double)
}
```

Anything conforming to `Vehicle` must also conform to `Named` (provide `name` and `nickname`) *and* provide `speed` and `accelerate(by:)`.

## Protocol conformance

A type conforms by listing the protocol after its name and implementing every requirement:

```swift
struct Car: Vehicle {
    var name: String
    var nickname: String?
    var speed: Double = 0

    mutating func accelerate(by amount: Double) {
        speed += amount
    }

    func draw() { }       // if Vehicle also required Drawable
}
```

Structs, enums, and classes can all conform. This is the key advantage over inheritance: a `struct` — a value type — can adopt a protocol's shape without becoming a class.

## Protocol extensions — the heart of POP

A protocol extension adds **concrete method implementations** that every conforming type inherits for free. This is how you share behavior without a base class:

```swift
extension Drawable {
    func drawTwice() {
        draw()
        draw()
    }
}

struct Circle: Drawable {
    func draw() { print("circle") }
}

let c = Circle()
c.drawTwice()     // "circle" "circle" — inherited from the extension, no code in Circle
```

Every type conforming to `Drawable` now has `drawTwice()`, implemented once. You can also add methods that aren't requirements at all — entirely new API surface added through the extension:

```swift
extension Drawable {
    var description: String { "a drawable thing" }
}
```

## Default implementations

The most powerful pattern: declare a method as a requirement *and* provide a default in an extension. Conforming types get the default but can override it:

```swift
protocol Greetable {
    var name: String { get }
    func greet() -> String
}

extension Greetable {
    func greet() -> String {
        "Hello, \(name)"
    }
}

struct Guest: Greetable {
    let name: String
    // uses the default greet()
}

struct VIP: Greetable {
    let name: String
    func greet() -> String {        // overrides the default
        "Welcome back, \(name)!"
    }
}

print(Guest(name: "Mei").greet())   // "Hello, Mei"
print(VIP(name: "Mei").greet())     // "Welcome back, Mei!"
```

::: warning Static dispatch gotcha
A method that is *only* in an extension (not a protocol requirement) uses **static dispatch**. If a conforming type defines the same method, calling it through a variable typed as the protocol still runs the extension's version — the type's implementation is invisible. To get dynamic dispatch (the type's override wins), the method must be a **requirement** declared in the protocol body. The `greet()` example above works correctly precisely because `greet()` is a requirement.
:::

## Protocol composition

You can require conformance to multiple protocols at once with `&`:

```swift
func process(item: some Codable & Hashable) {
    // item conforms to both Codable and Hashable
}
```

`some Codable & Hashable` means "some specific concrete type that conforms to both." You can also define a typealias for reuse:

```swift
typealias CodableHashable = Codable & Hashable

func store(_ item: some CodableHashable) { }
```

For a heterogeneous collection (different concrete types), use the existential form `any Codable & Hashable` (see below).

## `Any`, `AnyObject`, and `any Protocol`

Swift has three "any" forms, each for a different purpose:

- **`Any`** — can hold a value of *any* type (value or reference). It's the top type.
- **`AnyObject`** — can hold a reference to *any* class instance. It's class-only; it exists for ObjC interop (an `id` that's guaranteed to be an object).
- **`any Protocol`** — an **existential**: a boxed value of *some* type that conforms to `Protocol`. The concrete type is determined at runtime.

```swift
protocol Drawable {
    func draw()
}

struct Circle: Drawable { func draw() {} }
struct Square: Drawable { func draw() {} }

// Existential array — heterogeneous, each element may be a different concrete type
let shapes: [any Drawable] = [Circle(), Square()]
for shape in shapes {
    shape.draw()
}
```

The `any` keyword was introduced by SE-0335 in Swift 5.6 to make the boxing cost visible. Swift 6 makes `any` **mandatory** — writing `let shapes: [Drawable]` (without `any`) is an error, because the implicit existential hid a runtime cost the type system should expose. If you see `any` in modern Swift, read it as "this is a boxed, runtime-dispatched value."

## `some` vs `any`

Both hide the concrete type behind a protocol, but they are opposites:

| | `some Protocol` | `any Protocol` |
|---|---|---|
| Concrete type | Fixed at compile time (caller doesn't see it) | Chosen at runtime (can vary per value) |
| Dispatch | Static (inlinable) | Dynamic (boxed, vtable lookup) |
| Cost | Zero boxing | Boxing allocation + indirection |
| Heterogeneous? | No — one concrete type per call | Yes — mixed types in one collection |

```swift
// Opaque — returns one fixed concrete type, hidden from the caller
func makeShape() -> some Drawable {
    Circle()              // always Circle; caller sees "some Drawable"
}

// Existential — can return different types at runtime
func randomShape() -> any Drawable {
    Bool.random() ? Circle() : Square()
}
```

**Prefer `some` by default.** It has no boxing cost and the compiler can specialize. Reach for `any` only when you genuinely need heterogeneity — a mixed array, a dictionary of values of different conforming types.

## Generic constraints

Inside a generic function, you constrain the type parameter with a protocol. This gives you access to the protocol's API inside the function body:

```swift
func drawAll<T: Drawable>(_ items: [T]) {
    for item in items {
        item.draw()        // T: Drawable guarantees draw() exists
    }
}
```

`<T: Drawable>` and `some Drawable` as a parameter are closely related — both mean "a single concrete type conforming to `Drawable`." The generic form lets you name `T` (useful when the type appears in multiple positions, e.g., a return type or a second parameter).

## When protocols don't work: `@objc`

For ObjC interop — delegates used by `UITableView`, `URLSession`, or any Objective-C framework — a protocol must be marked `@objc`. `@objc` protocols have restrictions:

- Only `class` types (specifically `NSObject` subclasses) can conform — **no structs, no enums**.
- No default implementations (ObjC has no protocol extensions).
- Methods can be `@objc optional` — the ObjC pattern of "the delegate may or may not implement this."

```swift
@objc protocol DownloadDelegate {
    func didStartDownload()
    @objc optional func didProgress(_ fraction: Double)    // optional
    func didFinishDownload(_ data: Data)
}

class Controller: NSObject, DownloadDelegate {
    func didStartDownload() { }
    func didFinishDownload(_ data: Data) { }
    // didProgress is optional — not implementing it is fine
}
```

`@objc` protocols are the bridge to Objective-C's runtime and delegate pattern. For pure-Swift code, prefer non-`@objc` protocols with default implementations.

## Practical example: a `Repository`

A repository abstracts persistence. The protocol defines the contract; a default extension provides a convenience method; two concrete types implement storage differently:

```swift
protocol Repository {
    associatedtype Item: Equatable
    func fetchAll() -> [Item]
    func save(_ item: Item)
}

extension Repository {
    // Default: save only if the item isn't already present
    func saveIfNew(_ item: Item) {
        guard !fetchAll().contains(item) else { return }
        save(item)
    }
}

struct MemoryRepository: Repository {
    typealias Item = String
    private var storage: [String] = []

    func fetchAll() -> [String] { storage }
    func save(_ item: String) {
        storage.append(item)        // value type — a real impl would mutate a backing store
    }
}

struct CoreDataRepository: Repository {
    typealias Item = String
    func fetchAll() -> [String] {
        // In real code: NSFetchRequest …
        return []
    }
    func save(_ item: String) {
        // In real code: NSEntityDescription + context.save()
        print("CoreData: saving \(item)")
    }
}

let repo = CoreDataRepository()
repo.saveIfNew("hello")    // uses the default — prints "CoreData: saving hello"
```

Both repositories inherit `saveIfNew` without writing it. A third repository that needs custom dedup logic can override `saveIfNew` (it's a requirement-free extension method, so it uses static dispatch — call it on the concrete type, not the existential, to get the override). This is POP replacing a `BaseRepository` class hierarchy: the behavior is shared, but neither concrete type inherits from a base class, and both can be structs.

## Comparison with Objective-C

| | Swift protocols | Objective-C `@protocol` |
|---|---|---|
| Conforming types | struct, enum, class | class only (`NSObject`) |
| Default implementations | Yes — via extensions | No |
| Optional methods | Only on `@objc` protocols | `@optional` (the only model) |
| Generics | `associatedtype`, `some`, `any` | None |

See [ObjC page 05](../objective-c/05-categories-and-protocols.md) for the ObjC protocol model. Every Swift protocol that needs to interop with ObjC is forced into `@objc` and inherits ObjC's limitations; pure-Swift protocols are strictly more capable.

## What's next

You can now define capabilities as protocols, share behavior through extensions, and choose between `some` and `any` with a reason. The next page generalizes this further with generics — type parameters, constraints, associated types, and the `some`/`any` distinction at the type level.

**Next** → [Generics](./07-generics.md)
