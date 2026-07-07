---
title: Why Objective-C
tier: objective-c
platform: ios
---

# Why Objective-C

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › Why Objective-C

**Goal**

You will understand where Objective-C came from, why a language from the 1980s still matters in 2026, and where you will actually encounter it in iOS development. After this page you will know whether the rest of this tier is worth your time.

**Prerequisites**

- None. This is the first page of the Objective-C tier.

## What you'll learn

This page is the orientation. It does not teach syntax — that starts on the next page. Instead it answers three questions:

1. Where did Objective-C come from?
2. Why is it still on your machine?
3. When will you actually touch it?

If you have ever opened a UIKit header, hit a stack trace that bottoms out in `NSObject`, or tried to bridge a Swift type to a C API, you have already been reading Objective-C without realizing it. This tier teaches you to read it fluently and write it correctly.

## A short history

Objective-C was created in the early 1980s by **Brad Cox** and **Tom Love** at Productivity Products International. Their idea was to take the object-oriented message-passing model from **Smalltalk** and graft it onto **C**, so that developers could keep using the C they already knew while gaining objects.

The key design choice — and the thing that makes Objective-C feel alien next to Swift — is that objects communicate by *sending messages*, not by *calling methods*. A message send is a runtime decision: the runtime looks up the selector (the message name) on the receiver and dispatches to whatever implementation is currently bound there. The same source code can dispatch to different implementations at runtime. This is described in detail on [page 02](./02-syntax-foundations.md).

In 1988, **NeXT** (Steve Jobs's post-Apple company) licensed Objective-C and built the **NeXTSTEP** operating system and application frameworks on top of it. Those frameworks — `AppKit`, `Foundation`, and the Application Kit — became the template for every Apple framework that followed.

::: info Timeline
- **1984** — Cox and Love create Objective-C (Smalltalk objects + C).
- **1988** — NeXT licenses Objective-C; builds NeXTSTEP on it.
- **1996** — Apple acquires NeXT for $429M. NeXTSTEP becomes the foundation of Mac OS X.
- **2007** — iPhone OS (later iOS) ships with UIKit, written in Objective-C.
- **2014** — Apple announces Swift. Objective-C enters maintenance mode but is not deprecated.
- **2026** — UIKit, Foundation, CoreFoundation, and every framework SwiftUI is built on are still Objective-C under the hood.
:::

## Why it still matters

Swift is the future, but it runs on top of an Objective-C substrate. Concretely:

- **UIKit is Objective-C.** `UIView`, `UIViewController`, `UILabel`, `UITableView` — all implemented in Objective-C. Every SwiftUI `UIViewRepresentable` wraps an ObjC object.
- **Foundation is Objective-C.** `NSObject`, `NSArray`, `NSDictionary`, `NSString`, `NSNotification`, `NSRunLoop` — all ObjC. Swift's `String`, `Array`, `Dictionary` bridge to these automatically.
- **CoreFoundation is C with ObjC-style objects.** `CFString`, `CFArray`, `CFDictionary` are toll-free bridged to their Foundation counterparts (see [page 04](./04-memory-management.md)).
- **The runtime is the runtime.** Swift classes that inherit from `NSObject` participate in the Objective-C runtime. `@objc` and `@objc dynamic` exist precisely so Swift can opt back into the message-dispatch world.

When you write `import UIKit` in Swift, you are importing a module whose public surface is Objective-C. The Swift you write calls through bridges the compiler generates.

## Where you still find it

| Surface | What you'll see |
|---|---|
| **System framework headers** | `.h` files in `<SDK>/System/Library/Frameworks`. The canonical API reference for UIKit is ObjC. |
| **CoreFoundation** | Pure-C API with ObjC-style object lifetimes. Used by CoreGraphics, CoreText, CFNetwork. |
| **Legacy codebases** | Apps written before 2014, or apps that adopted Swift gradually. Many enterprise iOS apps still have ObjC cores. |
| **Third-party SDKs** | Some ad networks, analytics SDKs, and payment SDKs ship ObjC binaries or expect ObjC-compatible integration. |
| **C++ interop** | Objective-C++ (`.mm` files) lets you mix ObjC and C++ in one translation unit — the only sanctioned way to bridge UIKit to a C++ engine. |

If you ever debug a crash in a shipped iOS app, the stack trace will almost always pass through ObjC frames. Reading it requires reading ObjC.

## Objective-C vs Swift

Both compile to native code and both use ARC (Automatic Reference Counting). The differences are about dispatch, dynamism, and ergonomics.

| Dimension | Objective-C | Swift |
|---|---|---|
| Origin | Smalltalk + C (1984) | Apple (2014) |
| Compilation | Compiled native (LLVM) | Compiled native (LLVM) |
| Type system | Dynamic, weakly typed at runtime (`id`) | Static, strongly typed; `Any` exists but is deliberate |
| Dispatch | Message passing (runtime, late-bound) | Direct / vtable by default; `dynamic` opts into ObjC runtime |
| Nullability | `nil` can be sent any message (no-op) | `Optional` enforced by compiler |
| Generics | Lightweight (clang `__kindof`, Xcode 7+) | First-class |
| Value types | Structs only; collections are classes | `struct` everywhere; collections are value types |
| Memory | ARC (was MRC pre-2011) | ARC |
| Error handling | `NSError **` out parameter | `throws` / `Result` |
| Syntax | `[bracket message sending]` | `dot.method()` |
| Interop | Calls C directly; bridges to C++ via `.mm` | Bridges to ObjC via module; C via `import` |

The single biggest mental shift coming from Swift: in ObjC, calling a method is *sending a message*, and sending a message to `nil` is legal and returns `nil`/`0`/`NO` — it does not crash. This is a feature, not a bug, and it shapes how legacy code is written.

## Objective-C++

A `.mm` file is compiled as **Objective-C++** — you can mix Objective-C and C++ in the same translation unit. This is the only supported way to call C++ from UIKit-facing code without a C shim layer.

```objc
// EngineWrapper.mm — Objective-C++
#import "EngineWrapper.h"
#include <vector>
#include <string>

@implementation EngineWrapper {
    std::vector<std::string> _items;  // C++ member in an ObjC class
}

- (instancetype)initWithCapacity:(NSUInteger)capacity {
    self = [super init];
    if (self) {
        _items.reserve(capacity);
    }
    return self;
}

- (void)addItem:(NSString *)item {
    _items.push_back(std::string(item.UTF8String));  // ObjC → C++ std::string
}

- (NSUInteger)count {
    return _items.size();
}

@end
```

Rules to remember:

- Use `.mm` only when you need C++ interop. A plain `.m` file compiles faster.
- Objective-C++ exception semantics differ from both languages; avoid throwing across the boundary.
- ARC and C++ smart pointers (`std::unique_ptr`) coexist, but you must be explicit at the seams — use `__bridge` casts (see [page 04](./04-memory-management.md)).

## What this tier will not teach you

To set expectations:

- **This is not an app-building tier.** There is no shipping artifact at the end. It is a language reference.
- **This is not a runtime internals course.** We cover `objc_msgSend` behavior enough to write correct code, not enough to write a runtime hook.
- **This is not a Swift migration guide.** Interop is covered on [page 11](./11-objc-swift-interop.md), but the focus is reading and writing ObjC, not converting it.

## What's next

The next page drops you into the syntax that differs most from Swift and C: message sending, the header/implementation split, and the C types ObjC inherits. By the end of page 02 you will be able to read a small `.h` / `.m` pair and know what every token does.

**Next** → [Syntax foundations](./02-syntax-foundations.md)
