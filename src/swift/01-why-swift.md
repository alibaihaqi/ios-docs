---
title: Why Swift
tier: swift
platform: ios
---

# Why Swift

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Why Swift

**Goal**

You will understand what Swift is, what design problems it solves, how it evolved from a 2014 announcement to a 6.0 language with strict concurrency, and where it sits relative to Objective-C. After this page you will know why the rest of this tier exists and whether the investment is worth it.

**Prerequisites**

- None. This is the first page of the Swift tier.
- Reading [Why Objective-C](../objective-c/01-why-objective-c.md) first helps, but is not required.

## What you'll learn

This page is orientation. It does not teach syntax — that starts on [page 02](./02-types-and-optionals.md). Instead it answers:

1. What were Swift's design goals, and what do they mean in practice?
2. How did the language get from 1.0 to 6.0?
3. Why was ABI stability a milestone?
4. Where does Swift win over Objective-C, and where does ObjC still matter?

If you have ever written `let x: String?` and wondered why the `?` is load-bearing, or seen `async/await` in a SwiftUI view and wanted to know what an `actor` actually is, this tier is for you.

## Design philosophy

Swift's stated goals, repeated in every WWDC intro since 2014, are three words: **Safe. Fast. Expressive.** Each has a concrete meaning.

### Safe

Safety in Swift means *the compiler rejects programs that would crash at runtime*. Not "fewer crashes" — the compiler enforces rules that make entire categories of crash impossible:

- **No uninitialized access.** A `let` or `var` must have a value before it is read. The compiler verifies every path through `init` assigns every stored property.
- **No nil without permission.** A `String` cannot be `nil`. A `String?` can, but you cannot use it as a `String` without explicitly unwrapping it. There is no `NSNull` surprise, no message-to-`nil`-returns-zero silent failure.
- **No unchecked overflow by default.** Arithmetic operators trap on overflow in debug; the `&+` / `&-` / `&*` operators opt into wrapping behavior deliberately.
- **Type-safe enums.** A `switch` over an enum must be exhaustive — adding a case forces every switch site to handle it. The compiler will not let a new enum case silently fall through.
- **Memory safety.** Exclusive access to memory is enforced (Swift 5.0+, SE-0176): you cannot read a `var` while another scope has an `inout` borrow on it. This rules out the aliasing bugs that make C "undefined behavior."

The difference shows up the moment you write code. In Objective-C, this compiles and silently does nothing when the outlet is `nil`:

```objc
// ObjC — compiles, no-ops at runtime if self.label is nil
[self.label setText:@"Hello"];
```

In Swift, the equivalent refuses to compile until you tell the compiler how `nil` should be handled:

```swift
// Swift — the compiler demands you acknowledge the optional
label?.text = "Hello"          // ok: skip the assignment if label is nil
// label.text = "Hello"        // compile error if label is an optional
guard let label = label else { return }
label.text = "Hello"           // ok: label is now a non-optional Label
```

And exhaustiveness turns "I added an enum case and forgot a switch site" from a runtime bug into a compile error:

```swift
enum Status { case pending, active }

func badge(for status: Status) -> String {
    switch status {
    case .pending:  return "⏳"
    case .active:   return "✅"
    // This compiles today. Add `case archived` to Status above and the
    // compiler flags this switch as non-exhaustive until you handle it —
    // no silent fall-through to a missing case.
    }
}
```

### Fast

Swift compiles to native LLVM machine code with whole-module optimization. In the regimes Swift targets — value-type-heavy data, protocol dispatch, generic specialization — it lands within a small constant factor of C. Apple's published benchmarks and many third-party ones consistently show Swift beating Objective-C on tight loops, largely because:

- Value types (`struct`, `enum`) live on the stack and avoid heap allocation and reference-counting traffic.
- Generic code is specialized per type at compile time, removing dynamic dispatch.
- Static dispatch is the default; you opt *into* the ObjC runtime with `dynamic`, not out of it.

### Expressive

Expressive means "you can say what you mean in few lines, and the reader can tell what you meant." Swift's tools for this are:

- **Closures with trailing-closure syntax** — `map { $0.uppercased() }` reads like prose.
- **Protocol-oriented programming** — shared behavior through protocol extensions, not deep class hierarchies.
- **Result builders** — the DSL machinery that lets SwiftUI declare a view tree as nested closures.
- **Macros (5.9+)** — `#expect`, `#Predicate`, `#Preview` are macros, expanding at compile time to typed code.
- **Async/await (5.5+)** — sequential-looking code that suspends without blocking a thread.

## A short history

Swift was announced at **WWDC 2014**. Chris Lattner led the language design; the team drew from Rust, Haskell, Objective-C, Python, and C#.

::: info Timeline
- **2014 — Swift 1.0.** Announced at WWDC. Optional types, value types, generics, ARC, REPL. Beta-only, no source stability.
- **2015 — Swift 2.0.** Error handling (`do`/`try`/`catch`/`throw`/`defer`), protocol extensions, `guard`, availability checking (`if #available`). **Open-sourced** in December under the Apache 2.0 license.
- **2016 — Swift 3.0.** The **Swift Evolution** proposal process (`SE-NNNN`) takes over. Massive breaking changes: removed `++`/`--`, removed C-style `for` loops, renamed APIs to Swift guidelines (`view.backgroundColor` not `setBackgroundColor:`). This is where "Swift 2 code does not compile in Swift 3" became famous.
- **2017 — Swift 4.0.** `Codable` (SE-0166, automatic JSON/encoding), multi-line string literals (`"""`), `KeyPath`, `swap`/`swapAt`. ABI not yet stable; Swift 3 compatibility mode introduced.
- **2019 — Swift 5.0.** **ABI stability.** `Result` type, raw string literals (`#"..."#`), flattened `try` in `do` blocks.
- **2019 — Swift 5.1.** Opaque return types (`some`), property wrappers (SE-0258), result builders (then "function builders") — the substrate of SwiftUI, also announced in 2019.
- **2020 — Swift 5.3.** Multiple trailing closures, package resources, `#` directives.
- **2021 — Swift 5.5.** **Concurrency.** `async`/`await`, `Task`, `Actor`, `AsyncSequence`, `Sendable`. The biggest language addition since error handling.
- **2022 — Swift 5.7.** Regex literals, `any`/`some` on parameters, distributed actors (preview).
- **2023 — Swift 5.9.** **Macros** (SE-0389), `if`/`switch` as expressions, noncopyable types (preview), `Observation` macro framework (replaces `ObservableObject` for SwiftUI).
- **2024 — Swift 6.0.** **Strict concurrency checking** becomes the default in language mode 6. Data-race safety is now a compile-time guarantee, not a warning.
:::

## Why ABI stability was a milestone

**ABI** stands for Application Binary Interface — the binary-level contract for how types are laid out in memory, how functions are called, and how the runtime metadata is encoded. **Source stability** ("code I wrote last year compiles today") and **ABI stability** ("a binary compiled last year links today") are different things.

Before Swift 5, every Swift compiler version produced a different ABI. A framework compiled with Swift 4.0 could not be loaded by an app compiled with Swift 4.2. Apple could not ship a Swift-written system framework in iOS because the framework binary would only work with one compiler version.

Swift 5 locked the ABI (iOS 12.2 / macOS 10.14.4, 2019). Consequences:

- **The Swift runtime ships in the OS.** Your app no longer bundles the Swift standard library; iOS provides it. App binaries got smaller.
- **Binary framework distribution.** XCFrameworks with `.swiftinterface` files let you ship a closed-source Swift framework that works across compiler versions.
- **Apple frameworks can be Swift.** SwiftUI, StoreKit 2, WidgetKit, SwiftData are Swift-native. Before ABI stability this was impossible.

Source stability (your code compiles across minor versions) came with Swift 5 too, via the `@available` and `#if swift(>=)` machinery plus a commitment to additive evolution. Swift 5 source compiles in Swift 6 (with possible warnings under strict concurrency).

## Where Swift excels vs Objective-C

Both compile to native code, both use ARC, both target the same runtimes. The differences are in the type system and the defaults:

- **Type safety.** Swift has no `id` — no "any object" you can message blindly. `Any` exists but is deliberately awkward to use. Generics are real (specialized at compile time), not clang `__kindof` hints.
- **Value types.** `struct`, `enum`, and the standard-library collections (`Array`, `Dictionary`, `Set`, `String`) are value types. Copies are independent. This alone removes a huge class of aliasing bugs that ObjC's `NSMutableArray`-shared-by-reference world is full of.
- **Protocol-oriented programming.** Swift's protocols can have default implementations via extensions, and they apply to value types — not just classes. You build behavior through composition, not inheritance.
- **Concurrency.** `async`/`await`, `Actor`, `Sendable` make data-race safety a compiler-checked property. ObjC has GCD (queues), but the compiler cannot stop you from sharing mutable state across queues.
- **Error handling.** `throws`/`catch` is typed and mandatory at the call site (`try`). ObjC's `NSError **` out-parameter is convention, not enforced.
- **No header files.** One `.swift` file is both interface and implementation. The module system (`import FrameworkName`) generates the interface. No `.h` / `.m` split, no `NS_ASSUME_NONNULL_BEGIN` audit regions.
- **Optionals.** The compiler enforces nil-handling. See [page 02](./02-types-and-optionals.md).

The value-type point is the one that most changes day-to-day code. The same "modify a list" operation does different things in each language:

```swift
// Swift — Array is a value type; the original is untouched
var original = [1, 2, 3]
var copy = original
copy.append(4)
print(original)   // [1, 2, 3]
```

```objc
// ObjC — NSMutableArray is shared by reference; the original changes too
NSMutableArray *original = [@[@1, @2, @3] mutableCopy];
NSMutableArray *copy = original;          // same object
[copy addObject:@4];
NSLog(@"%@", original);                    // (1, 2, 3, 4) — aliasing!
```

The ObjC defense is `@property (copy)` and `mutableCopy` at every seam. Swift makes the safe behavior the default and charges you nothing for it.

Where ObjC still matters: system framework internals (UIKit, Foundation are ObjC under the hood), legacy codebases, C++ interop via Objective-C++, and any time you need the runtime dynamism ObjC gives for free (method swizzling, KVO, message forwarding). See the [Objective-C tier](../objective-c/01-why-objective-c.md).

## The ecosystem

Swift is no longer just "the iOS language":

- **SwiftUI** (2019) — declarative UI framework. The replacement story for UIKit, also used for macOS, watchOS, tvOS, and visionOS.
- **SwiftData** (2023) — Swift-native persistence, replacing Core Data's ObjC API surface.
- **Vapor** and **Hummingbird** — server-side Swift web frameworks. Swift runs on Linux; many production backends ship Swift services.
- **Swift Package Manager (SPM)** — the build system and dependency manager. Xcode uses SPM under the hood since Xcode 11; pure-SPM packages work for both Apple and Linux targets.
- **Swift Testing** (2024) — the macro-based test framework (`@Test`, `#expect`, `#require`). Replaces much of the `XCTest` ceremony. Covered on [page 13](./13-testing-swift-code.md).
- **Macros** (5.9+) — compile-time code generation. `#Predicate`, `#Preview`, `#expect`, and the `@Observable` macro are all macros, not magic.

## Open source

Swift has been open source since December 2015, hosted at [swift.org](https://www.swift.org/) and [github.com/apple/swift](https://github.com/apple/swift). The language evolves through **Swift Evolution** — the `SE-NNNN` proposal process in the `apple/swift-evolution` repo:

1. A pitch is discussed on the forums (`forums.swift.org`).
2. A formal proposal (`SE-0NNN`) is submitted to `swift-evolution`.
3. A review manager opens a 1–2 week review period.
4. The core team accepts, rejects, or returns it for revision.
5. Accepted proposals ship in the next Swift version.

Anyone can propose. Many of the most-used features — `Codable`, property wrappers, async/await, macros — came from the community, not Apple internals. This is the reason Swift's surface area has grown the way it has: it is not a closed corporate language.

## Swift vs Objective-C

| Dimension | Swift | Objective-C |
|---|---|---|
| Origin | Apple, 2014 | Cox/Love, 1984 (Smalltalk + C) |
| Type system | Static, strongly typed | Dynamic; `id` is weakly typed at runtime |
| Dispatch | Direct / vtable by default; `dynamic` opts into ObjC runtime | Message passing (runtime, late-bound) |
| Value types | `struct` / `enum` everywhere; collections are value types | C structs only; `NSArray`/`NSDictionary` are classes |
| Nullability | `Optional<T>` enforced by compiler | `nil` can be messaged (no-op, returns `nil`/`0`/`NO`) |
| Error handling | `throws` / `catch` (typed, mandatory `try`) | `NSError **` out-parameter (convention) |
| Generics | First-class, specialized at compile time | Lightweight (`__kindof`, Xcode 7+) |
| Functions / blocks | Closures (with trailing-closure syntax) | Blocks (`^`) |
| Concurrency | `async`/`await`, `Actor`, `Sendable` (compiler-checked) | GCD queues (convention, not enforced) |
| Headers | None — module is the interface | `.h` / `.m` split |
| Memory | ARC | ARC (was MRC pre-2011) |
| Open source | Yes, swift.org | No (clang is, the runtime is, the language spec is informal) |

The single biggest mental shift coming from ObjC: in Swift, the compiler is adversarial. It will refuse to compile code that *might* be unsafe, even if you "know" it is fine at runtime. The escape hatches (`!`, `try!`, `as!`, `unowned`) exist, but using one is a deliberate statement that you accept the crash risk.

## What this tier will not teach you

To set expectations:

- **This is not an app-building tier.** No shipping artifact at the end. It is a language reference. For app building, see the [Beginner](../beginner/) and [Intermediate](../intermediate/) tiers.
- **This is not a SwiftUI tutorial.** SwiftUI shows up as a *consumer* of Swift features (result builders, property wrappers, `Observation`), but the focus is the language.
- **This is not a Swift compiler internals course.** We cover enough to write correct, idiomatic code — not enough to write a SIL pass.

## What's next

The next page drops into the part of Swift that most shapes how you write it: the value/reference distinction and the optional type. By the end of [page 02](./02-types-and-optionals.md) you will be able to read `let name: String? = user?.name` and know exactly what every token means and what happens at runtime when `user` is `nil`.

**Next** → [Types and optionals](./02-types-and-optionals.md)
