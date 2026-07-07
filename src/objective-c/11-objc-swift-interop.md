---
title: ObjC-Swift interop
tier: objective-c
platform: ios
---

# ObjC-Swift interop

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › ObjC-Swift interop

**Goal**

You will move code across the Objective-C / Swift boundary in both directions — exposing ObjC to Swift via a **bridging header**, exposing Swift to ObjC via `@objc` / `@objcMembers`, and shaping the imported API with **nullability annotations**, **lightweight generics**, `NS_SWIFT_NAME`, and `NS_REFINED_FOR_SWIFT`. You will learn what *cannot* cross (Swift-only features), how to make an ObjC header import as clean Swift, and how to combine `#selector` / `#keyPath` for compile-time-checked strings. After this page you can maintain a mixed-source codebase in either direction.

**Prerequisites**

- [10 KVO and NotificationCenter](./10-kvo-notificationcenter.md)

## The two directions

Interop is bidirectional and the mechanisms differ:

- **ObjC → Swift:** a **bridging header** (`ProductName-Bridging-Header.h`) lists the ObjC headers you want visible. The Swift compiler reads it and generates Swift declarations for every ObjC class, protocol, and method it imports. One-way: ObjC cannot see Swift this way.
- **Swift → ObjC:** annotate Swift declarations with `@objc` (or `@objcMembers` for a whole class). The compiler emits ObjC-compatible metadata into the module. ObjC code then `#import`s the generated header (`ProductName-Swift.h`).

A mixed app often uses both: a Swift view controller calls an ObjC model class (bridging header), and that same ObjC model class calls back into a Swift delegate (generated header + `@objc`).

## The bridging header — ObjC into Swift

### Creating it

When you add your first `.m` file to a Swift-target Xcode project, Xcode offers to create the bridging header for you. Accept, and it creates `ProductName-Bridging-Header.h`. (You can also create the file manually and set its path under **Build Settings → Swift Compiler - General → Objective-C Bridging Header**.)

The header is just a list of `#import`s — nothing else. Everything you import here becomes visible to **all** Swift files in the target:

```objc
// ProductName-Bridging-Header.h
#ifndef ProductName_Bridging_Header_h
#define ProductName_Bridging_Header_h

#import "DataManager.h"
#import "User.h"
#import "TokenStore.h"

#endif
```

### What Swift sees

Given this ObjC header:

```objc
// DataManager.h
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DataManager : NSObject
- (nullable instancetype)initWithURL:(NSURL *)url;
- (void)loadAllWithCompletion:(void (^)(NSArray * _Nullable items, NSError * _Nullable error))completion;
@end

NS_ASSUME_NONNULL_END
```

Swift sees (roughly):

```swift
class DataManager: NSObject {
    init?(url: URL)
    func loadAll(completion: @escaping ([Any]?, Error?) -> Void)
}
```

Notice the imports: `NSURL` → `URL`, `NSArray` → `[Any]`, `NSError * _Nullable` in a completion → `Error?`, the nullable `init` → a failable initializer `init?`. The compiler does this translation from the ObjC type encodings and the nullability annotations.

::: tip One bridging header per target
The bridging header is per-target, not per-file. Every ObjC class you want in Swift goes in the same header. For a framework target (not an app), the equivalent is the **umbrella header** — the framework's main `.h` that imports all public headers, which the Swift compiler reads automatically.
:::

## @objc and @objcMembers — Swift into ObjC

Mark a Swift class, method, property, or initializer with `@objc` to make it visible to ObjC:

```swift
@objc class Counter: NSObject {
    @objc var count: Int = 0
    @objc func increment() { count += 1 }
    @objc func reset(to value: Int) { count = value }
}
```

ObjC then uses it through the generated header (`#import "ProductName-Swift.h"`):

```objc
Counter *counter = [[Counter alloc] init];
[counter increment];
[counter resetTo:5];
NSLog(@"%ld", (long)counter.count);
```

`@objcMembers` (Swift 4+) on a class exposes **all** members to ObjC at once — equivalent to annotating every property, method, and init individually:

```swift
@objcMembers class Counter: NSObject {
    var count: Int = 0          // @objc
    func increment() { count += 1 }   // @objc
}
```

### What cannot be exposed

Only `@objc`-compatible declarations cross. These cannot:

- **Generics with `associatedtype`** — protocol associated types have no ObjC representation. A protocol with an `associatedtype` cannot be `@objc`.
- **`@objc` protocols cannot have associated types** and cannot require methods with Swift-only signatures (tuples, `some`/`any`).
- **Tuples as return or parameter types** — no ObjC encoding. Use a struct or multiple parameters.
- **`some` / `any` opaque types** (`some View`) — no runtime representation in the ObjC model.
- **Swift `enum` without a raw type** — only `Int`-backed enums (or those with `@objc`) bridge; enums with associated values do not.
- **Structs without `@objc`** — only `@objc`-bridgable structs (and there are few; most don't bridge). Use a class subclassing `NSObject` instead.
- **Top-level functions and global variables** — only members of `NSObject`-derived classes (or `@objc`-annotated enums) cross reliably.

When the compiler rejects an `@objc` annotation, the reason is almost always one of these: the declaration uses a Swift-only type feature with no ObjC counterpart.

## Nullability annotations

Nullability is the highest-leverage annotation you can add. Without it, every imported pointer becomes an **implicitly-unwrapped optional** (`!`) in Swift — usable, but you lose compile-time nil safety and a typo becomes a runtime crash.

The annotations, applied to ObjC properties, parameters, and return types:

| Annotation | Swift import | Meaning |
|---|---|---|
| `_Nonnull` | `T` (non-optional) | Cannot be nil. |
| `_Nullable` | `T?` | May be nil. |
| `_Null_unspecified` | `T!` (implicitly unwrapped) | Unknown — legacy/untyped. |
| `null_resettable` | `T!` (with a nonnil setter) | Property that reads nonnil but can be set to nil to reset to a default (e.g. `title`). |

Applied inline:

```objc
- (void)loadUser:(NSString * _Nonnull)userID
      completion:(void (^ _Nullable)(User * _Nullable user))completion;
```

### NS_ASSUME_NONNULL_BEGIN / END

Writing `_Nonnull` on every pointer is noisy. The audit-style macros flip the default for a whole region: inside the block, *every* simple pointer is assumed `_Nonnull` unless you explicitly mark it `_Nullable`. You opt *out* of nonnull rather than opt in:

```objc
NS_ASSUME_NONNULL_BEGIN

@interface User : NSObject
@property (nonatomic, copy) NSString *name;                 // nonnull (default)
@property (nonatomic, copy, nullable) NSString *nickname;   // nullable (explicit)
- (nullable instancetype)initWithID:(NSString *)userID;     // nullable return (explicit)
- (BOOL)fetchFriend:(User * _Nullable * _Nullable)outFriend;// nullable out-param
@end

NS_ASSUME_NONNULL_END
```

Rules of the audit region:

- `nullable` / `nonnull` / `null_resettable` are the property-attribute spellings (`@property (nonatomic, nullable, copy) NSString *x;`).
- `_Nullable` / `_Nonnull` are the type-annotation spellings (on parameters, returns, ivars, block types).
- Inside the region, `NSError **` is special: both pointers are inferred `_Nullable`, and the Swift importer maps the `BOOL` + trailing `NSError **` shape to `throws`.
- Cocoa's standard collection types (`NSArray`, `NSDictionary`) need their *contents* annotated too — see lightweight generics below.

::: tip Audit an existing header in one pass
To migrate a legacy header without touching every line: wrap it in `NS_ASSUME_NONNULL_BEGIN` / `END`, then add `nullable` / `_Nullable` only to the pointers that can actually be nil. The compiler warns about each remaining unannotated pointer in a non-audited file, so the macro region silences the noise and forces you to make a deliberate call on each nullable case.
:::

## Lightweight generics

ObjC's `NSArray<NSString *>` and `NSDictionary<NSString *, User *>` are **lightweight generics** — compile-time type parameters that bridge cleanly to Swift typed arrays and dictionaries:

```objc
@property (nonatomic, copy) NSArray<User *> *friends;     // → Swift: [User]
@property (nonatomic, copy) NSDictionary<NSString *, NSNumber *> *scores; // → [String: NSNumber]
```

Without the type parameter, Swift imports `NSArray *` as `[Any]` — every element needs a cast. Always parameterize collections in headers meant for Swift. Note these generics are erased at runtime (ObjC's runtime has no reified generics); they are a compile-time contract only, and Swift respects them on import.

## NS_SWIFT_NAME — renaming for Swift

The ObjC method `fetchUserWithID:` imports into Swift as `fetchUser(withID:)` — the default translation trims "With" prefixes and lowercases. If you want a different Swift name, `NS_SWIFT_NAME` overrides it:

```objc
- (void)fetchUserWithID:(NSString *)userID NS_SWIFT_NAME(fetchUser(id:));
```

Now Swift sees `fetchUser(id:)`. The macro takes a Swift-style signature string — full label and parameter names. It works on classes, protocols, methods, properties, enums, and enum cases:

```objc
typedef NS_ENUM(NSInteger, LogLevel) {
    LogLevelError   NS_SWIFT_NAME(.error),
    LogLevelWarning NS_SWIFT_NAME(.warning),
    LogLevelInfo    NS_SWIFT_NAME(.info),
} NS_SWIFT_NAME(LogLevel);
```

This imports as a Swift `enum LogLevel: Int { case error, warning, info }`. `NS_SWIFT_NAME` is the primary tool for making an ObjC API feel native in Swift without changing the ObjC call sites.

## NS_REFINED_FOR_SWIFT

Sometimes the auto-imported Swift API is fundamentally awkward — a method that should be a Swift computed property, a set of constants that should be an OptionSet, an initializer that should take a `Duration`. `NS_REFINED_FOR_SWIFT` tells the importer to rename the declaration with a leading `__` and suppress it from autocompletion, so you can write a thin Swift wrapper that calls through to it:

```objc
// ObjC header
- (double)timeoutSeconds NS_REFINED_FOR_SWIFT;
```

```swift
// Swift extension
extension NetworkService {
    var timeout: Duration {
        .seconds(__timeoutSeconds)   // calls the refined ObjC method
    }
}
```

Swift callers see only `timeout: Duration`, not the raw `__timeoutSeconds`. Use this when you want to wrap rather than rename — typical for converting error codes to a Swift `Error` enum, or wrapping a C-style API into a Swift `Result`.

## #selector and #keyPath — compile-time-checked strings

ObjC APIs that take a method name or a key path historically took a string (`@selector(handleTap:)` is partially checked, but key paths were bare `@"name"` strings — typos crashed at runtime). Swift (and modern ObjC via the `#` macros) gives compile-time checking:

```objc
// #selector — verifies the method exists at compile time
[button addTarget:self
           action:#selector(handleTap:)
 forControlEvents:UIControlEventTouchUpInside];

- (void)handleTap:(UIButton *)sender { /* ... */ }

// #keyPath — verifies the key path exists at compile time
[self.user addObserver:self
            forKeyPath:#keyPath(User.name)
               options:NSKeyValueObservingOptionNew
               context:&ctx];
```

Both `#selector` and `#keyPath` are checked by the compiler against the actual declarations — rename a property and the build fails instead of crashing at runtime. Prefer them over string literals everywhere a Cocoa API accepts one.

## A complete mixed-source example

An ObjC `DataManager` that loads users, consumed by a Swift view controller via the bridging header, with the ObjC side calling back into a Swift delegate.

**ObjC side — `DataManager.h`:**

```objc
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@class DataManager;

@protocol DataManagerDelegate <NSObject>
- (void)dataManager:(DataManager *)manager didLoadUsers:(NSArray *)users;
@end

@interface DataManager : NSObject

@property (nonatomic, weak, nullable) id<DataManagerDelegate> delegate;

- (instancetype)initWithURL:(NSURL *)url;
- (void)fetchUsers NS_SWIFT_NAME(fetchUsers());
- (NSArray *)usersForRole:(NSString *)role NS_SWIFT_NAME(users(forRole:));

@end

NS_ASSUME_NONNULL_END
```

**Bridging header** exposes it to Swift:

```objc
// ProductName-Bridging-Header.h
#import "DataManager.h"
```

**Swift side — `UserListViewController.swift`:**

```swift
import UIKit

class UserListViewController: UIViewController, DataManagerDelegate {

    let dataManager: DataManager

    init(url: URL) {
        self.dataManager = DataManager(url: url)   // imported initializer
        super.init(nibName: nil, bundle: nil)
        dataManager.delegate = self
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) not used") }

    override func viewDidLoad() {
        super.viewDidLoad()
        dataManager.fetchUsers()                    // NS_SWIFT_NAME'd; clean Swift call
    }

    func dataManager(_ manager: DataManager, didLoadUsers users: [Any]) {
        // delegate callback fired from ObjC into Swift
        let names = users.compactMap { ($0 as? User)?.name }
        DispatchQueue.main.async { /* render */ }
    }
}
```

What makes this work, end to end:

- `DataManager` is a plain `NSObject` subclass — automatically bridgeable.
- The header is in the audit region, so `url` imports as `URL` (not `URL!`), `delegate` imports as `id<DataManagerDelegate>?`.
- `NS_SWIFT_NAME` cleans up the Swift call sites (`fetchUsers()`, `users(forRole:)`) without changing ObjC.
- The Swift class conforms to the ObjC `DataManagerDelegate` protocol — Swift protocols that conform to ObjC protocols work because the methods are `@objc`-compatible (the ObjC protocol implies it).
- `delegate` is `weak` on the ObjC side, so the Swift view controller is not retained by its data manager.

## What's next

You can now move code across the language boundary in either direction and shape the import to feel native. The final page in the Objective-C section covers **testing** — setting up an `XCTestCase` target in ObjC, the `XCTAssert*` assertion macros, testing delegate callbacks and async code with `XCTestExpectation`, and the mocking patterns (and why Swift needs them less).

**Next** → [Testing ObjC code](./12-testing-objective-c.md)
