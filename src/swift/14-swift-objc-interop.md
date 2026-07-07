---
title: Swift-ObjC interop
tier: swift
platform: ios
---

# Swift-ObjC interop

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Swift-ObjC interop

**Goal**

You will expose Swift code to Objective-C using `@objc` and `@objcMembers`, understand what ObjC-mobile Swift features exist, use `#selector`/`#keyPath` for compile-time-checked calls, set up a bridging header, and navigate the requirements for mixed-source projects. After this page you can add Swift to an ObjC project or expose Swift APIs to ObjC consumers.

**Prerequisites**

- [04 Structs and classes](./04-structs-and-classes.md)
- [06 Protocols and POP](./06-protocols-and-pop.md)

## The two directions

Interop is bidirectional, and each direction uses a different mechanism:

- **Swift → ObjC:** annotate Swift declarations with `@objc`. The compiler emits ObjC-compatible metadata into the module's generated header (`ProductName-Swift.h`). ObjC code `#import`s this header.
- **ObjC → Swift:** a **bridging header** (`ProductName-Bridging-Header.h`) lists the ObjC headers you want visible. The Swift compiler reads it and generates Swift declarations for every ObjC class, protocol, and method.

This page covers the **Swift → ObjC** direction from Swift's perspective. For the reverse direction (bridging header, nullability annotations, lightweight generics), see the [ObjC-Swift interop](../objective-c/11-objc-swift-interop.md) page in the Objective-C section.

## @objc attribute

The `@objc` attribute exposes a Swift member to Objective-C. It tells the compiler to emit the declaration in the generated `-Swift.h` header so that ObjC can call it.

The requirements are strict:

1. **The enclosing type must be an `NSObject` subclass** (or use `@objc` on an `@objcMembers` class). Pure Swift classes (no `NSObject`) cannot be exposed.
2. **All parameter and return types must have ObjC equivalents.** No tuples, no generics with associated types, no `some`/`any`, no closures that capture non-`@objc` types.
3. **Methods must use ObjC-compatible dispatch.** Instance methods become ObjC instance methods; static methods become class methods.

```swift
import Foundation

@objc class Counter: NSObject {
    @objc var count: Int = 0

    @objc func increment() {
        count += 1
    }

    @objc func reset(to value: Int) {
        count = value
    }
}
```

On the ObjC side:

```objc
#import "ProductName-Swift.h"

Counter *counter = [[Counter alloc] init];
[counter increment];
[counter resetTo:5];
NSLog(@"%ld", (long)counter.count);
```

What happens when you add `@objc` to a method: the compiler generates an ObjC method pointer (`IMP`) that calls through Swift's vtable or witness table. The method receives an `objc_msgSend`-compatible signature: `id _Nonnull (*)(id _Nonnull, SEL _Nonnull, ...)`. This is the only way an ObjC caller can invoke a Swift method — through the selector-based dispatch that the ObjC runtime understands.

### What cannot cross the @objc boundary

| Swift feature | ObjC equivalent | Can cross? |
|---|---|---|
| `struct` | No struct support | **No** — only classes visible |
| `enum` with associated values | No enum with payloads | **No** — only `Int`-backed `@objc` enums |
| `tuple` (Int, String) | No tuple type | **No** — use a struct or separate params |
| Generics `func<T>(x: T)` | No generics | **No** — concrete types only |
| `some View` (opaque types) | No opaque type support | **No** |
| `any SomeProtocol` (existentials) | `id<SomeProtocol>` | **Yes**, if protocol is `@objc` |
| Closures with capture | Blocks (`^`) | **Yes**, if `@convention(block)` |
| `async` functions | No `async`/`await` | **No** — expose a completion-handler wrapper |

The rule: if the Swift feature relies on static dispatch, value semantics, or compile-time-only resolution, ObjC cannot see it. Only types and methods that map to ObjC's dynamic message dispatch model are bridgeable.

### @objc on initializers

Marking an initializer `@objc` exposes it so ObjC can allocate the object:

```swift
@objc class User: NSObject {
    @objc let id: String
    @objc let name: String

    @objc init(id: String, name: String) {
        self.id = id
        self.name = name
    }
}
```

A failable initializer `init?` becomes `- (nullable instancetype)initWith...` in ObjC — the `?` maps to `nullable`.

### @objc on properties

Properties marked `@objc` generate ObjC `@property` declarations. The property attributes (strong/weak, readwrite/readonly, copy/assign) are inferred from the Swift declaration:

```swift
@objc class User: NSObject {
    @objc let id: String              // readonly, copy
    @objc var name: String            // readwrite, copy
    @objc weak var parent: User?      // weak, nullable
    @objc private(set) var age: Int   // readonly in ObjC
}
```

## @objcMembers

`@objcMembers` (Swift 4+) is a class-level annotation that exposes **all** eligible members to ObjC — equivalent to applying `@objc` to every property, method, subscript, and initializer:

```swift
@objcMembers class DataStore: NSObject {
    var items: [String] = []          // implicitly @objc
    func addItem(_ item: String) { }  // implicitly @objc
    func removeAll() { }              // implicitly @objc
}
```

### When to use @objcMembers vs explicit @objc

| Use | Reason |
|---|---|
| `@objcMembers` | Whole class is an ObjC utility or delegate, every member needs exposure. Convenient for thin wrappers. |
| Explicit `@objc` | Only specific members need exposure — keeps the `-Swift.h` header lean, avoids accidental exposure of Swift-only helpers. |

`@objcMembers` is convenient but **coarse**. It exposes every member that can legally be `@objc`. A method that happens to use a tuple internally (and is therefore non-`@objc`-compatible) will silently not be exposed — the compiler does not warn. With explicit `@objc`, the compiler tells you immediately which methods cannot bridge.

## Dynamic dispatch and @objc dynamic

Swift normally dispatches methods statically (through the vtable) or via protocol witness tables. To make a property observable via KVO, you need **dynamic dispatch** — the method call must go through `objc_msgSend` so that the ObjC runtime can intercept it:

```swift
@objc class ObservableCounter: NSObject {
    @objc dynamic var count: Int = 0
}
```

Without `dynamic`, the compiler may inline or devirtualize the getter/setter. The `dynamic` modifier forces the compiler to emit ObjC-compatible accessor methods (`-count` and `-setCount:`) that always go through message dispatch. This is required for:

- **KVO** — `addObserver:forKeyPath:options:context:` needs to observe `-setCount:`.
- **Core Data** — `@NSManaged` properties require dynamic dispatch.
- **Cocoa binding** — AppKit bindings need KVO-compliant accessors.

The `dynamic` keyword does not require `@objc` (it implies it), but the two are typically paired:

```swift
@objcMembers class Counter: NSObject {
    dynamic var count: Int = 0       // implicitly @objc
}
```

### What dynamic does at the machine level

Without `dynamic`, calling `counter.count = 5` produces a direct write to the property's offset in the object's memory. The `setCount:` Selector is never called. With `dynamic`, the compiler emits a call to `objc_msgSend(counter, @selector(setCount:), 5)`, which resolves through the ObjC runtime's method cache and calls the dynamically-registered `setCount:` implementation.

This indirection is slower (a few nanoseconds per call) but enables the runtime to intercept the access for KVO, Core Data faulting, and Cocoa bindings.

## The NSObject requirement

Only classes that inherit from `NSObject` (or `NSManagedObject`) can expose members to ObjC. The reason is structural: ObjC objects have an `isa` pointer at offset 0 that points to their class metadata, and ObjC method dispatch works through the class's method list. Swift native objects do not have an `isa` pointer — they use a different runtime layout.

This means:

- **Swift structs are invisible to ObjC.** A struct cannot be passed to an ObjC method that expects `id`. Use a class wrapping the struct, or use `NSValue` boxing.
- **Pure Swift classes (no `NSObject` root) are invisible to ObjC.** A class that does not inherit from `NSObject` cannot have `@objc` members.
- **Only one inheritance root.** A Swift class can inherit from `NSObject` or another ObjC-compatible class (like `UIViewController`), but it cannot inherit from a pure Swift class and also expose members to ObjC.

The workaround for structs: make an `@objc` class wrapper:

```swift
struct User {
    let id: String
    let name: String
}

@objc class UserBridge: NSObject {
    @objc let id: String
    @objc let name: String

    init(user: User) {
        self.id = user.id
        self.name = user.name
    }
}
```

## #selector() and #keyPath()

In ObjC, selectors and key paths were historically string-based. `#selector()` and `#keyPath()` (available from both Swift and modern ObjC) make them compile-time-checked:

```swift
button.addTarget(self, action: #selector(buttonTapped), for: .touchUpInside)

@objc func buttonTapped(_ sender: UIButton) {
    // handle tap
}
```

The `#selector` expression takes a reference to a method. The compiler verifies that the method exists, is `@objc`-exposed, and matches the expected signature. If you rename `buttonTapped`, the build fails — no runtime crash.

For key paths used with KVO or Cocoa binding:

```swift
observer.observe(user, keyPath: #keyPath(User.name), options: [.new])
```

`#keyPath` produces a `String` — the ObjC key path — but the compiler checks that the path is valid for the type at compile time. Rename the `name` property and the build breaks.

### Why these are better than strings

| | `#selector` / `#keyPath` | String literal |
|---|---|---|
| Compile-time check | Yes — method/property existence verified | No — typo crashes at runtime |
| Refactoring | Rename propagates automatically | Manual search-and-replace |
| Autocomplete | Xcode suggests selectors and key paths | No help |
| Nil safety | Cannot produce a nil selector | Typo produces an unexpected nil |

In Swift, prefer `#selector` and `#keyPath` over any string-based alternative. There is no good reason to use a string literal for these APIs.

## Mixed-source project example

A Swift view controller that uses a bridging header to call an ObjC data manager (ObjC → Swift), and the ObjC data manager has nullability annotations and lightweight generics for clean Swift import.

**Step 1 — Create the bridging header.**

When you add a `.m` file to a Swift-target Xcode project, Xcode prompts you to create `ProductName-Bridging-Header.h`. Accept. The header imports the ObjC headers you want Swift to see:

```objc
// ProductName-Bridging-Header.h
#import "DataManager.h"
```

**Step 2 — The ObjC header with nullability and generics.**

```objc
// DataManager.h
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@class User;

@interface DataManager : NSObject

@property (nonatomic, copy, readonly) NSArray<User *> *users;
@property (nonatomic, strong, readonly) NSURL *baseURL;

- (instancetype)initWithBaseURL:(NSURL *)url NS_DESIGNATED_INITIALIZER;
- (void)refreshWithCompletion:(void (^)(NSError * _Nullable error))completion;

@end

NS_ASSUME_NONNULL_END
```

**Step 3 — Swift uses the ObjC class naturally.**

```swift
// UserListViewController.swift
import UIKit

class UserListViewController: UIViewController {

    let manager: DataManager

    init(baseURL: URL) {
        self.manager = DataManager(baseURL: baseURL)   // NSURL → URL
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("not implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        manager.refresh { error in                     // completion handler bridged
            if let error = error {
                print("Error: \(error)")
            }
        }
    }
}
```

What makes this work:

- `DataManager` is an `NSObject` subclass — automatically bridgeable.
- The `NS_ASSUME_NONNULL_BEGIN` region means `baseURL` imports as `URL` (not `URL!`).
- `NSArray<User *>` imports as `[User]` — typed, not `[Any]`.
- The `completion:` block imports as `((Error?) -> Void)?` — the `NSError?` becomes `Error?`.
- The designated initializer `initWithBaseURL:` imports as `init(baseURL:)`.

**Step 4 — Swift code exposed back to ObjC.**

```swift
@objc class UserListViewController: UIViewController {
    @objc let manager: DataManager

    @objc func reloadData() {
        manager.refresh { [weak self] error in
            self?.updateUI()
        }
    }

    @objc private func updateUI() {
        // update table view
    }
}
```

Now ObjC code (or Cocoa's target-action system) can call `userListVC.reloadData()` through the generated `-Swift.h` header.

## Objective-C++ (.mm files)

When a project mixes C++ with ObjC or Swift, the file extension `.mm` tells the compiler to use the Objective-C++ dialect — a superset that combines C++ and ObjC syntax in one compilation unit:

```cpp
// Wrapper.mm
#import "Wrapper.h"
#include <c++/library.h>      // C++ header

@implementation Wrapper {
    std::unique_ptr<CppClass> _cpp;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _cpp = std::make_unique<CppClass>();
    }
    return self;
}

- (void)process {
    _cpp->doWork();
}

@end
```

The `.mm` file is an Objective-C++ translation unit — it can call C++ methods and send ObjC messages. The result is an ObjC object that Swift can see through the bridging header, with the C++ implementation hidden inside the `.mm` file.

**Strategy for mixed C++/Swift:**

1. Write an ObjC wrapper class in `.mm` files that exposes a pure ObjC interface (no C++ types).
2. Put the ObjC interface in a `.h` file (no C++ headers).
3. Import the `.h` in the bridging header.
4. Swift calls the wrapper as a normal ObjC class, unaware of the C++ underneath.

This is the standard pattern for using C++ libraries (like Core ML, audio DSP, game engines) from Swift.

## Comparison with ObjC-Swift interop

| Aspect | Swift → ObjC | ObjC → Swift |
|---|---|---|
| Mechanism | `@objc` / `@objcMembers` | Bridging header |
| Generated file | `ProductName-Swift.h` | Compiler reads header directly |
| Visibility control | Explicit `@objc` (opt-in) or `@objcMembers` (class-wide) | `#import` in bridging header (opt-in) |
| Value types | Cannot cross — must wrap in class | Cannot cross — ObjC has no structs |
| Nullability | Inferred from Swift (`?` → nullable) | Must annotate in ObjC header |
| Generics | Concrete types only | Lightweight generics bridge cleanly |

The asymmetry is important: Swift → ObjC requires the Swift side to **opt in** to ObjC compatibility (every `@objc` annotation is a deliberate decision). ObjC → Swift requires the ObjC side to be **imported** in the bridging header (every import is a deliberate decision). Both directions are opt-in, and neither direction exposes a type's internals by default.

## What's next

You can now expose Swift code to ObjC, use `#selector` and `#keyPath` for compile-time-safe calls, and set up a mixed-source project. You have completed both language sections.

Browse the [Objective-C section](../objective-c/) for the ObjC perspective on interop, or revisit the [Beginning tier](../beginner/) to apply what you have learned.
