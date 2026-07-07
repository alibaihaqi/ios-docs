---
title: Structs and classes
tier: swift
platform: ios
---

# Structs and classes

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Structs and classes

**Goal**

You will define `struct` and `class` types correctly, know when `mutating` is required and why, read the memberwise initializer, write designated and convenience initializers, use `===` for identity, and make the struct-vs-class call with Apple's reasoning. After this page you can choose the right kind of type for a given job and defend the choice.

**Prerequisites**

- [02 Types and optionals](./02-types-and-optionals.md)
- [03 Functions and closures](./03-functions-and-closures.md)

## The fundamental distinction

`struct` and `class` look almost identical in syntax — both can have stored properties, computed properties, methods, and protocols. The difference is one word with big consequences:

| | `struct` | `class` |
|---|---|---|
| Kind | Value type | Reference type |
| Assignment | Copies | Shares a reference |
| Inheritance | None (only protocols) | Single superclass |
| Mutability | `let` freezes all properties | `let` fixes the reference, not the object |
| Initializer | Auto memberwise | You must write `init` |
| `mutating` methods | Required to modify `self` | Not a concept |
| Identity | Value equality (`==`) | Reference identity (`===`) |

## `struct` — value type

A struct holds its data in its own storage. Assigning a struct copies all of its stored properties.

```swift
struct Point {
    var x: Double
    var y: Double
}

var a = Point(x: 1, y: 2)
var b = a          // independent copy
b.x = 99
print(a.x, b.x)    // 1.0 99.0
```

### The memberwise initializer

For a struct with no custom `init`, the compiler synthesizes a **memberwise initializer** — one parameter per stored property, in declaration order:

```swift
struct User {
    let id: Int
    var name: String
    var nickname: String?
}

let u = User(id: 1, name: "Mei", nickname: nil)
```

The moment you write any custom `init`, the memberwise initializer disappears. If you want both, put the custom initializer in an extension — initializers in extensions do not suppress the synthesized memberwise one:

```swift
struct User {
    let id: Int
    var name: String
    // memberwise init is available: User(id:name:)
}

extension User {
    init(id: Int) {
        self.id = id
        self.name = "Anonymous"
    }
}

let a = User(id: 1, name: "Mei")   // memberwise
let b = User(id: 0)                // custom, from the extension
```

### `mutating` — modifying `self` in a value type

A struct method that assigns to a stored property (or to `self`) must be marked `mutating`. The keyword tells the compiler — and the reader — that this method can only be called on a `var` instance, not a `let`:

```swift
struct Counter {
    var count: Int

    mutating func increment() {     // 'mutating' goes before 'func'
        count += 1
    }

    mutating func reset() {
        self = Counter(count: 0)   // you can even reassign self entirely
    }
}

var c = Counter(count: 0)
c.increment()
print(c.count)    // 1

let frozen = Counter(count: 5)
// frozen.increment()   // compile error: 'let' is immutable
```

`mutating` is the value-type analog of "this method needs write access." It is unnecessary on classes — a class method can always mutate the shared object, because `self` is a reference, not a copy.

## `class` — reference type

A class is a heap-allocated object with identity. Assigning a class variable copies the *reference*, not the object — both variables now point at the same instance.

```swift
class Account {
    var balance: Double
    init(balance: Double) { self.balance = balance }
}

let alice = Account(balance: 100)
let bob = alice          // bob and alice are the same Account object
bob.balance = 50
print(alice.balance)     // 50.0 — visible through both references
```

Notice `let alice` does not prevent `alice.balance = 50`. `let` on a class constant fixes the *reference*; the object's mutable properties are still mutable. To make the balance immutable you would declare `let balance` — and then no code anywhere can change it after `init`.

### You must write `init`

Classes do not get a memberwise initializer. Every class must declare at least one `init`, and every stored property must be assigned by the time `init` returns:

```swift
class Account {
    var balance: Double

    init(balance: Double) {
        self.balance = balance
    }
}
```

If a property has a default value, the initializer need not touch it:

```swift
class Session {
    var token: String = ""       // default
    var startedAt: Date

    init() {
        self.startedAt = Date()
    }
}
```

### Designated vs convenience initializers

Class initializers come in two kinds, with strict delegation rules:

- **Designated** — the primary initializer. Calls a designated initializer on the superclass (`super.init`) and sets every property this class introduces.
- **Convenience** — a secondary initializer, marked `convenience`. Calls another initializer on *this* class (`self.init`), never `super`.

```swift
class Account {
    let id: String
    var balance: Double

    // Designated — calls super (NSObject here, implicitly), sets all props.
    init(id: String, balance: Double) {
        self.id = id
        self.balance = balance
    }

    // Convenience — delegates to this class's designated init.
    convenience init(id: String) {
        self.init(id: id, balance: 0)
    }
}

let a = Account(id: "A1", balance: 100)
let b = Account(id: "A2")              // balance 0
```

The two-phase init rules, enforced by the compiler:

1. Every property introduced by this class is set *before* `super.init` is called (phase 1: up the chain).
2. After `super.init` returns, you may call methods / use `self` (phase 2: down the chain).
3. A convenience initializer must call another initializer on `self` before it does anything else.

The intent is "no object is ever half-initialized." You cannot use a method before the superclass has finished initializing.

### Failable initializers

`init?` produces an optional of the type — it returns `nil` instead of an instance when the inputs are invalid:

```swift
struct Temperature {
    let celsius: Double

    init?(celsius: Double) {
        guard celsius >= -273.15 else { return nil }   // below absolute zero
        self.celsius = celsius
    }
}

if let t = Temperature(celsius: 20) {
    print(t)               // Temperature(celsius: 20.0)
}
Temperature(celsius: -300) // nil
```

Failable inits work on both structs and classes. On a subclass, a failable designated init calling a failable `super.init(...)` propagates `nil` automatically — if the super init returns `nil`, your init returns `nil` too, with no extra code on your side. (You cannot write `self = super.init(...)` in a class init; that reassignment form is only valid inside a `mutating func` on a value type, as in `reset()` above.)

### `final` — prevent inheritance

Marking a class `final` forbids subclassing. Marking a method or property `final` forbids overriding that member. This is also a performance hint: a final class can use direct dispatch, since the compiler knows there are no subclasses.

```swift
final class APIKey {            // cannot be subclassed
    let value: String
    init(value: String) { self.value = value }
}

class Base {
    final func templateMethod() { /* ... */ }   // subclasses cannot override
}
```

Apple frameworks use `final` heavily for value-like classes (`UUID`, `URL`, `IndexPath` are effectively values despite being classes). Reach for it whenever you do not intend a type to be subclassed.

## Identity: `===` and `!==`

For class instances, `===` tests *reference identity* — "do these two variables point at the same object?" `!==` is the negation. They work only on class instances (and `AnyObject`), never on structs:

```swift
let x = Account(balance: 1)
let y = x
let z = Account(balance: 1)

x === y      // true  — same object
x === z      // false — different objects, even though balances match
x !== z      // true

// For structs, === does not exist:
// Point(x: 1, y: 2) === Point(x: 1, y: 2)   // compile error
```

`==` is separate: it tests *value equality*, defined by conforming to `Equatable`. Two different `Account` objects with the same balance are `==` only if you implement `==` to mean that. By default, classes inherit `NSObject`'s `isEqual:` (identity) in ObjC-bridged classes, or have no `==` at all in pure Swift classes unless you add `Equatable`.

## Copy-on-write

Value types copy on assignment — but copying a 10,000-element `Array` on every assignment would be ruinous. Swift's standard-library collections use **copy-on-write (COW)**: assignment is cheap (both variables share the underlying buffer, with a reference count), and the actual copy happens *only when one side mutates*:

```swift
var original = Array(1...10_000)   // 10,000 ints
var copy = original                 // cheap — shares the buffer
print(original.count, copy.count)   // 10000 10000

copy[0] = 99                        // NOW the buffer is copied
print(original[0])                  // 1 — original's buffer is untouched
```

The invariant the type system promises ("assignment is independent") holds; the implementation just defers the work. COW is built into the standard-library collection types; your own `struct` holding an `Array` field gets it transitively. A struct wrapping a large reference-type buffer can implement COW itself with `isKnownUniquelyReferenced` for the same pay-only-on-mutation behavior.

## When to use struct vs class

Apple's guidance, repeated in every WWDC since 2015, is **"use structures by default."** The decision tree:

**Use a `struct` when:**

- The type represents a *value* — a piece of data, a model, a piece of state. `User`, `Point`, `Money`, `Coordinate`.
- Copy semantics are what you want. Two counters should be independent; two coordinate points should be independent.
- The type is small and copied often. Structs live on the stack (or in a containing allocation), avoiding ARC traffic.
- You want thread-safe-by-construction. A value type cannot be shared, so there is no data race on it.

**Use a `class` when:**

- The type has *identity* — one canonical instance that multiple parts of the program observe and mutate, with lifetime managed by ARC and shared via weak delegates / captured closures. A `URLSession`, a `CoreLocation` manager, a view controller.
- You need *inheritance*. A view controller hierarchy, a `NSOperation` subclass.
- You need *Objective-C interop*. `NSObject` subclasses, KVO, `@objc dynamic` for runtime dynamism.

Most model and state types in a SwiftUI app are structs — `struct User`, `struct AppState`, `struct Settings`. Most "services" and "managers" are classes — `class NetworkClient`, `class DataStore` (when shared). The `@Observable` macro (Swift 5.9+) works on both, but is most often applied to a class that several views observe.

## Complete example: `User` as both

The same model, written both ways, showing the copy-vs-reference difference:

```swift
// As a struct — copy on assignment
struct UserStruct {
    let id: Int
    var name: String
    var nickname: String?

    var displayName: String { name }                  // computed property
    mutating func rename(to newName: String) {        // mutating: modifies self
        name = newName
    }
}

var s1 = UserStruct(id: 1, name: "Mei", nickname: nil)   // memberwise init
var s2 = s1                                              // copy
s2.rename(to: "Mei Chen")
print(s1.name)      // "Mei"      — s1 untouched
print(s2.name)      // "Mei Chen"

// As a class — share on assignment
final class UserClass {
    let id: Int
    var name: String
    var nickname: String?

    var displayName: String { name }

    init(id: Int, name: String, nickname: String? = nil) {   // explicit init
        self.id = id
        self.name = name
        self.nickname = nickname
    }

    func rename(to newName: String) {        // no 'mutating' — classes always can
        name = newName
    }
}

let c1 = UserClass(id: 1, name: "Mei")
let c2 = c1                                  // shared reference
c2.rename(to: "Mei Chen")
print(c1.name)      // "Mei Chen" — c1 sees the change; c1 and c2 are one object
print(c1 === c2)    // true       — reference identity
```

The struct version is the right choice here: a user is a value, copies should be independent, there is no identity to share. The class version is what you would reach for only if something needed to hold a single canonical `User` and observe mutations to it — in which case `@Observable final class User` is the modern form.

## Comparison with Objective-C

In Objective-C, *everything* inherits from `NSObject` — there are no value types beyond C structs (which cannot have methods, initializers, or conformances). Every model object is a class, every collection is a mutable shared reference, and `@property (copy)` is the manual defense against aliasing. Swift inverts this: structs are the default and value semantics are free.

| | Swift | Objective-C |
|---|---|---|
| Default container | `struct` | `NSObject` subclass |
| Identity | `===` on classes | `==` calls `isEqual:` (often identity) |
| Initializers | Memberwise (structs); designated/convenience (classes) | `init…` methods, one designated |
| Inheritance | Classes only; single | All classes; single, from `NSObject` |

## What's next

You can now pick the right container and write its initializers. The next page covers Swift's other value-type workhorse — `enum` with associated values and raw values — and the `switch` exhaustiveness that makes pattern matching a compile-checked operation rather than a runtime fall-through.

**Next** → [Enums and pattern matching](./05-enums-and-pattern-matching.md)
