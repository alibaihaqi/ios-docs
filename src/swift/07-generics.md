---
title: Generics
tier: swift
platform: ios
---

# Generics

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Generics

**Goal**

You will write generic functions and generic types, constrain type parameters with protocols and `where` clauses, define associated types in protocols, and distinguish opaque types (`some`) from existential types (`any`) with a clear reason for each. After this page you can write one piece of code that works over any type — safely, with full compiler checking — and know when the compiler specializes it.

**Prerequisites**

- [06 Protocols and POP](./06-protocols-and-pop.md)

## Generic functions

A generic function has one or more **type parameters** — placeholders written in angle brackets — that the compiler fills in at each call site based on the argument types:

```swift
func identity<T>(_ value: T) -> T {
    return value
}

let s = identity("hello")    // T = String, returns String
let n = identity(42)         // T = Int, returns Int
```

`<T>` declares `T` as a type parameter. The function accepts any `T` and returns the same type. The body knows nothing about `T` except that it exists — it cannot call any methods on `value` because `T` is unconstrained.

## Generic types

A generic type parameterizes the type itself, so every method uses the same `T`:

```swift
struct Stack<T> {
    private var items: [T] = []

    mutating func push(_ item: T) {
        items.append(item)
    }

    func pop() -> T? {
        items.isEmpty ? nil : items.removeLast()
    }
}

var intStack = Stack<Int>()
intStack.push(1)
intStack.push(2)
print(intStack.pop())    // Optional(2)

var stringStack = Stack<String>()
stringStack.push("a")
```

`Stack<Int>` and `Stack<String>` are distinct types — the compiler treats them as separate specializations. `T` is fixed for the lifetime of each instance.

## Type constraints

An unconstrained `T` can only be moved around, never inspected. A **type constraint** restricts `T` to types conforming to a protocol, unlocking that protocol's API:

```swift
func find<T: Equatable>(_ item: T, in array: [T]) -> Int? {
    for (index, element) in array.enumerated() {
        if element == item {        // == exists because T: Equatable
            return index
        }
    }
    return nil
}

find(3, in: [1, 3, 5])          // 1
find("b", in: ["a", "b", "c"])  // 1
```

`<T: Equatable>` means "any `T` that conforms to `Equatable`," which guarantees `==` is available. The constraint is checked at compile time — calling `find` with a non-`Equatable` type is an error before the program runs.

## The `where` clause

For constraints that don't fit the `<T: Protocol>` shorthand, use a `where` clause after the signature. It's equivalent in simple cases but scales to multiple constraints:

```swift
func maximum<T>(_ a: T, _ b: T) -> T where T: Comparable {
    return a > b ? a : b
}
// equivalent to: func maximum<T: Comparable>(_ a: T, _ b: T) -> T
```

The `where` clause shines with multi-type constraints or constraints on associated types:

```swift
func allEqual<C: Container>(_ container: C) -> Bool where C.Item: Equatable {
    // C.Item (the associated type) must be Equatable to compare elements
    return true
}
```

## Associated types in protocols

A protocol can't know the concrete types its conforming types will use. An **associated type** is a placeholder the conforming type fills in:

```swift
protocol Container {
    associatedtype Item
    mutating func append(_ item: Item)
    var count: Int { get }
    subscript(i: Int) -> Item { get }
}

struct IntBag: Container {
    typealias Item = Int           // explicit, or inferred from append(_:)
    private var items: [Int] = []

    mutating func append(_ item: Int) { items.append(item) }
    var count: Int { items.count }
    subscript(i: Int) -> Int { items[i] }
}
```

`associatedtype Item` says "this protocol has a type called `Item`; the conforming type decides what it is." The compiler infers `Item` from the method signatures (`append(_ item: Int)` ⇒ `Item = Int`), so the `typealias` is often optional. Associated types are the protocol-level analog of generic type parameters.

## Opaque types — `some Protocol`

`some Protocol` as a **return type** lets a function return a specific concrete type without exposing *which* one to the caller. The caller sees `some Protocol`; the compiler sees the real type and can specialize:

```swift
func makeView() -> some View {
    VStack {
        Text("Hello")
    }
}
```

The concrete return type is `VStack<TupleView<Text>>` — an ugly generic type the caller shouldn't have to name. With `some View`, the function promises "I return one fixed type that conforms to `View`," and the caller treats it as `some View`. Two rules:

1. **One concrete type per function.** Every `return` must produce the same type. You cannot return `Circle()` in one branch and `Square()` in another.
2. **The caller cannot rely on the concrete type.** It only knows the protocol.

`some` was introduced for return types in Swift 5.1 (SE-0244) and extended to parameter types in Swift 5.7 (SE-0328), where `some Protocol` on a parameter is sugar for a generic `<T: Protocol>`. SwiftUI is built on `some View` — every `body` returns it.

## Existential types — `any Protocol`

`any Protocol` is a **box** that can hold a value of *any* type conforming to the protocol, chosen at runtime. The concrete type can vary per element:

```swift
let shapes: [any Drawable] = [Circle(), Square(), Triangle()]
```

Each element is a different concrete type, wrapped in an existential container. The array is homogeneous at the element level (`any Drawable`) but heterogeneous in the underlying concrete types.

### `some` vs `any` — the decision

| | `some Protocol` | `any Protocol` |
|---|---|---|
| Concrete type | Fixed at compile time | Runtime-determined, can vary |
| Boxing cost | None | Yes — existential container |
| Dispatch | Static (specializable) | Dynamic (witness table lookup) |
| Heterogeneous collection? | No | Yes |

```swift
// some — one type, zero cost
func makeShape() -> some Drawable { Circle() }

// any — any type, boxing cost
let mixed: [any Drawable] = [Circle(), Square()]
```

**Default to `some`.** Use `any` only when you must store values of different concrete types together (a heterogeneous array, a dictionary of mixed conformers). The boxing and dynamic dispatch of `any` are real costs; `some` is free.

::: tip SE-0335 and Swift 6
The `any` keyword was introduced in Swift 5.6 (SE-0335) to make existentials explicit. In Swift 6, omitting `any` is an **error** — `let x: Drawable` no longer compiles; you must write `let x: any Drawable`. The older implicit form hid the runtime cost; the keyword forces you to acknowledge it.
:::

## Complete example: a generic `Cache`

A cache maps keys to values, keyed by anything hashable. Two type parameters, one constraint:

```swift
struct Cache<Key: Hashable, Value> {
    private var storage: [Key: Value] = [:]

    subscript(key: Key) -> Value? {
        get { storage[key] }
        set { storage[key] = newValue }
    }

    func values() -> [Value] {
        Array(storage.values)
    }

    mutating func clear() {
        storage.removeAll()
    }
}

var cache = Cache<String, Int>()
cache["one"] = 1
cache["two"] = 2
print(cache["one"] ?? 0)       // 1
print(cache.values())          // [1, 2] (order not guaranteed)

// Key can be any Hashable type — URL works too
var urlCache = Cache<URL, Data>()
urlCache[URL(string: "https://example.com")!] = Data()
```

`Key: Hashable` is required because `Dictionary` needs hashable keys. `Value` is unconstrained — it can be anything. One implementation, type-safe for every `(Key, Value)` pair, fully specialized by the compiler.

## Comparison with Objective-C

| | Swift generics | Objective-C |
|---|---|---|
| Mechanism | True parametric generics | Lightweight generics (compiler hints only) |
| Runtime checking | Compile-time | Type-erased at runtime |
| Collections | `Array<Int>` — type-safe | `NSArray<NSString *>` — erases to `id` at runtime |
| Generic types | Structs, enums, classes | Classes only (via `__kindof` / lightweight) |
| Constraints | Protocols, `where` clauses | None |

ObjC's "lightweight generics" (`NSArray<NSString *>`) are compiler hints for Swift interop and nullability — at runtime the array holds `id`, and inserting a non-`NSString` is not caught. Swift generics are real: the compiler enforces the type at every call site, and a `Stack<Int>` physically cannot hold a `String`. See [ObjC page 06](../objective-c/06-foundation-essentials.md) for the ObjC collection model.

## What's next

You can now write type-safe, reusable code over any type and choose `some` or `any` with a reason. The next page covers how Swift handles failure — throwing functions, `do`-`catch`, `try?` / `try!`, and the `Result` type — with the same compile-time safety you've seen throughout.

**Next** → [Error handling](./08-error-handling.md)
