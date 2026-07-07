---
title: iOS patterns in Swift
tier: swift
platform: ios
---

# iOS patterns in Swift

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › iOS patterns in Swift

**Goal**

You will understand how Swift's type system — protocols, value types, closures, and structured concurrency — reshaped classic iOS design patterns. After this page you recognise which patterns the language makes trivial (or unnecessary), and where the ObjC-era patterns still apply.

**Prerequisites**

- [06 Protocols and POP](./06-protocols-and-pop.md)
- [10 Swift concurrency](./10-swift-concurrency.md)

## How Swift changed iOS patterns

Objective-C patterns emerged from the language's constraints: no value types, no generics, no closures that were easy to pass around (blocks existed but were syntactically heavy), and no protocol-oriented design. The result was a pattern catalog built on:

- **Delegates** — single-protocol objects that handle events (because ObjC could not express anonymous closures concisely).
- **Singletons** — shared instances for coordination (because dependency injection required manual wiring with no compiler support).
- **Target-action** — string-based selector dispatch (because closures as properties were not idiomatic).
- **KVO** — runtime string-based observation (no property observers or published wrappers).
- **MVC** — massive view controllers (because separating logic required ceremony).

Swift's type system did not just add syntax — it made whole categories of patterns *trivial*, and others *unnecessary*. This page examines the mechanism behind that shift.

## Protocol-oriented dependency injection

In ObjC, DI was boilerplate and fragile. The typical approach was a protocol (often informally documented) implemented by a class, injected via a property typed as `id<Protocol>`:

```objc
// ObjC DI
@protocol DataService <NSObject>
- (void)fetchDataWithCompletion:(void (^)(NSArray *))completion;
@end

@interface ViewController ()
@property (nonatomic, weak) id<DataService> dataService;
@end
```

Nothing enforced the protocol conformance at the injection site. If you forgot to set `dataService`, the call silently did nothing (it was `nil`). Swift makes the same pattern first-class, and the type system ensures it is impossible to forget:

```swift
protocol DataService {
    func fetch() async throws -> [User]
}

struct ProductionService: DataService {
    func fetch() async throws -> [User] {
        // real URLSession call
    }
}

struct MockService: DataService {
    let result: Result<[User], Error>

    func fetch() async throws -> [User] {
        try result.get()
    }
}

struct ViewModel {
    let service: DataService

    func load() async throws -> [User] {
        try await service.fetch()
    }
}
```

Three things changed:

1. **Protocols are first-class types.** `DataService` is a type. The property `service` is non-optional — it must be set at initialization, or the program does not compile. In ObjC, the same property could be `nil` at any time.
2. **Value types conform to protocols.** `MockService` is a struct, not a class. No heap allocation, no reference counting. In ObjC, a mock was always a class with manual `-retain`/`-release` (or ARC).
3. **Generics compose with protocols.** `MockService` stores a `Result<[User], Error>` — the exact return shape, typed by the compiler. ObjC's id-based generics would erase this type.

The mechanism: Swift protocols define a *witness table* — a vtable of function pointers for each requirement. Every concrete type that conforms provides its own witness table. At the call site, `service.fetch()` dispatches through the witness table — no runtime introspection, no message sending. The compiler knows the exact method address at link time (or earlier, with whole-module optimisation).

> **Connection to your app:** The Intermediate tier's MVVM+URLSession setup ([Intermediate 03](../intermediate/03-async-urlsession.md)) uses a concrete service directly. Swapping in a protocol-based service (as above) makes that view model testable without network calls — see [Testing Swift code](./13-testing-swift-code.md) for the full pattern.

### Why ObjC could not do this

ObjC protocols are *message-based* — they dispatch via `objc_msgSend`. The runtime looks up the method implementation by selector at each call. This is flexible (you can forward messages, swizzle methods, add implementations at runtime) but it means:

- Every protocol call goes through dynamic dispatch.
- Protocols require `NSObject` conformance (or `@objc` attributes in modern ObjC).
- Value types (structs, enums) cannot conform to ObjC protocols because they are not objects — they cannot receive ObjC messages.

Swift's witness-table dispatch is static: the compiler resolves the method at compile time and generates a direct call (or a vtable offset). This makes protocol calls as fast as class method calls, and enables value types to conform.

## Value types eliminate shared-state bugs

In ObjC, every model object is a class — a reference type. If two view controllers hold the same `NSMutableArray *items`, mutating it in one screen affects the other:

```objc
// ObjC — two screens share the same NSMutableArray
self.items = [[NSMutableArray alloc] init];
[self.items addObject:@"A"];

// Later, in another screen:
[self.items removeAllObjects];  // first screen's data is gone
```

This is the "two screens modifying the same data" bug — it is the default in a reference-type world unless you explicitly copy (`[items copy]` or `items = array.copy`).

Swift structs eliminate the category:

```swift
struct AppState {
    var items: [String] = []
    var selectedIndex: Int?
}

// struct assignment is a copy
var state = AppState()
var other = state          // copy! other and state are independent
other.items.append("B")   // state.items is still []
```

The `mutating` keyword makes mutation explicit:

```swift
struct ViewModel {
    private var state: AppState

    mutating func addItem(_ item: String) {
        // Compiler requires 'mutating' — caller must use var
        state.items.append(item)
    }
}
```

If `ViewModel` were a class, `addItem` would not need `mutating` — and the caller would have no syntactic hint that the method changes internal state. `mutating` is a compiler-enforced annotation that says "this method writes to self." It makes the mutation visible in the type signature.

The mechanism: when you mutate a struct, Swift writes the new value in place (for `var` bindings) or creates a copy (for `let` bindings — which is a compile error for `mutating` methods). Under the hood, the compiler uses copy-on-write (CoW) for heap-backed storage like `Array` and `Dictionary` — the actual copy defers until a write occurs, making the pattern performant for large collections.

> **When to use struct vs class for models:** See [04 Structs and classes](./04-structs-and-classes.md) for the full decision tree.

## Closure-based callbacks → structured concurrency

Before `async`/`await`, async patterns were closure-heavy. A typical async chain:

```swift
// Pre-concurrency: completion handler pyramid
func loadProfile(userID: String, completion: @escaping (Result<Profile, Error>) -> Void) {
    fetchUser(id: userID) { result in
        switch result {
        case .success(let user):
            fetchPosts(for: user.id) { result in
                switch result {
                case .success(let posts):
                    completion(.success(Profile(user: user, posts: posts)))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
        case .failure(let error):
            completion(.failure(error))
        }
    }
}
```

With structured concurrency:

```swift
// With async/await: linear flow
func loadProfile(userID: String) async throws -> Profile {
    async let user = fetchUser(id: userID)
    async let posts = fetchPosts(for: userID)
    return try await Profile(user: user, posts: posts)
}
```

The language mechanism: `async`/`await` desugars each async function into a state machine — a heap-allocated continuation that records the program counter at each `await` point. When the function suspends, the thread returns to the pool. When the awaited result is ready, the runtime schedules the continuation on any available thread.

This is not a library feature. It is a **compiler transformation** — the same kind of transformation that `async`/`await` in C# and JavaScript perform. The compiler inserts the state machine directly into the function body, and the runtime (libdispatch under the hood on Apple platforms) manages the scheduling.

> **Full coverage:** See [10 Swift concurrency](./10-swift-concurrency.md) for tasks, actors, and `Sendable`.

## Observation patterns in Swift

Observation in ObjC was string-based. KVO relied on `@property` declarations, `addObserver:forKeyPath:options:context:`, and the `observeValueForKeyPath:` catch-all. It was runtime-only, untyped, and easy to get wrong (wrong key path → silent no-op, missed `removeObserver` → crash).

### The progression

**ObjC KVO:**

```objc
// ObjC KVO
[self.user addObserver:self
            forKeyPath:NSStringFromSelector(@selector(name))
               options:NSKeyValueObservingOptionNew
               context:NULL];

- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary *)change
                       context:(void *)context {
    NSString *newName = change[NSKeyValueChangeNewKey];
    // Must check keyPath, object, context — all manual
}
```

Every `observeValueForKeyPath:` is a single point that routes to different handlers by string comparison. A typo in the key path compiles fine and crashes at runtime.

**Swift `@Published` (Combine, iOS 13+):**

```swift
class ViewModel: ObservableObject {
    @Published var name: String = ""
}
```

`@Published` is a property wrapper that synthesises a `Publisher` — a Combine subject that emits new values through its wrapped value's `willSet` observer. The compiler generates the publisher accessor, so there is no runtime key-path resolution. `@Published` projects itself as a `Published<Value>.Publisher` — accessed via `$name`:

```swift
$name.sink { print($0) }
```

**Swift Observation framework (iOS 17+, Swift 5.9+):**

```swift
@Observable
class ViewModel {
    var name: String = ""
}

struct MyView: View {
    @Bindable var viewModel: ViewModel

    var body: some View {
        Text(viewModel.name)           // auto-tracking — no .sink or @Published
    }
}
```

`@Observable` (a macro) rewrites the class's accessors to register observers per-property. The compiler tracks which properties are read inside a view's `body` and only re-renders when those properties change. This eliminates the Combine dependency and the `ObservableObject` protocol entirely.

> **Applied usage:** The Intermediate tier's [02 The view model](../intermediate/02-viewmodel.md) uses `ObservableObject` with `@Published` — the Combine-based approach. The Advanced tier's [01 Why SwiftData](../advanced/01-why-swiftdata.md) covers the Observation framework pattern.

### How the type system enables Observation

All three approaches (KVO, Combine, Observation) depend on the same language mechanism: **property observers and accessor synthesis**.

- KVO uses the ObjC runtime's `willChangeValueForKey:`/`didChangeValueForKey:` — the compiler inserts these calls in the `set` accessor of an `@objc dynamic` property.
- `@Published` uses Swift's property wrapper desugaring — the compiler replaces the stored property with a wrapper instance and generates `willSet`-based publisher emissions.
- `@Observable` uses Swift macros (SE-0397) — the compiler rewrites the class body at the AST level, injecting per-property observation registrations.

In every case, the *mechanism* is a compile-time transformation that the type system makes possible: the compiler knows the property's type, its accessor shape, and whether it is observable.

## The Coordinator pattern in UIKit

The Coordinator pattern (from Soroush Khanlou's popularisation) manages navigation logic outside of view controllers. In Swift, it is simply a protocol:

```swift
protocol Coordinator: AnyObject {
    var childCoordinators: [Coordinator] { get set }
    func start()
}

class AppCoordinator: Coordinator {
    var childCoordinators: [Coordinator] = []
    let navigationController: UINavigationController

    init(navigationController: UINavigationController) {
        self.navigationController = navigationController
    }

    func start() {
        let vc = LoginViewController()
        vc.coordinator = self
        navigationController.pushViewController(vc, animated: true)
    }

    func didLogin() {
        let mainCoordinator = MainCoordinator(navigationController: navigationController)
        childCoordinators.append(mainCoordinator)
        mainCoordinator.start()
    }
}
```

In ObjC, the same pattern requires a formal `@protocol Coordinator` with `@required` and `@optional` methods, and every property requires explicit type erasure (`id<Coordinator>` arrays need `NSMutableArray` or `NSHashTable`). Swift's generics and protocol conformance by value or reference types make the coordinator trivial to define and enforce.

The mechanism: `protocol Coordinator: AnyObject` restricts conformance to **reference types** (classes, actors). This is essential because the pattern requires identity and shared mutation — two coordinators must be able to share the same `childCoordinators` array. The `[Coordinator]` array stores heterogenous coordinator types (any class conforming to `Coordinator`), dynamically dispatched through the protocol witness table.

**When it still matters:** The Coordinator pattern is UIKit-specific. SwiftUI handles navigation through `NavigationStack` and `NavigationPath` — the navigation is data-driven, not controller-driven. The Coordinator pattern is most relevant in UIKit apps or mixed SwiftUI-UIKit codebases, where `UIViewControllerRepresentable` bridges the two worlds.

## @Environment / @EnvironmentObject — type-system-driven DI

SwiftUI's `@Environment` and `@EnvironmentObject` eliminate explicit property propagation. You do not pass a `UserSettings` through 5 levels of initializers — you inject it once into the environment and read it anywhere in the view tree.

The mechanism:

```swift
// Injection point — at the root of the view tree
ContentView()
    .environmentObject(UserSettings())

// Consumption — any descendant view
struct ProfileView: View {
    @EnvironmentObject var settings: UserSettings    // no init parameter
}
```

How Swift makes this safe:

1. **Type-keyed storage.** `@EnvironmentObject` uses the object's type (`UserSettings`) as the key into an internal `[AnyKey: AnyObject]` dictionary maintained by the view hierarchy. The runtime looks up the value by type — no string keys, no key-path strings. If the type is not found, it is a **compile-time guaranteed runtime crash** (same as a force-unwrap), not a silent nil.
2. **`ObservableObject` conformance.** The object must conform to `ObservableObject`, which means SwiftUI can subscribe to its `objectWillChange` publisher. The view re-renders automatically when published properties change.
3. **Property wrapper desugaring.** `@EnvironmentObject` is a `DynamicProperty` wrapper — the framework reads the wrapped value from the environment storage before `body` is evaluated, and invalidates the view when the object changes.

The same mechanism extends to `@Environment(\.keyPath)` for built-in values (color scheme, locale, size class):

```swift
@Environment(\.colorScheme) var colorScheme
// Reads from the environment's root-level storage, keyed by the key path's type
```

> **Applied usage:** The Advanced tier's [06 UI tests](../advanced/06-ui-tests.md) shows `@EnvironmentObject` in context. This page focuses on how the type system enables the lookup — not how to use it in an app.

## Compare with ObjC

| Pattern | Swift | Objective-C |
|---|---|---|
| Dependency injection | Protocol conformance, non-optional, compile-time checked | `id<Protocol>` property, nil-unsafe, no enforcement |
| State sharing | Structs (value types, CoW) prevent accidental mutation | `NSMutableArray` / `NSMutableDictionary` — shared by default, must manually copy |
| Async callbacks | `async`/`await` (state machine, linear) | Blocks with manual thread hopping (`dispatch_async`) |
| Observation | `@Published` (Combine), `@Observable` (macro) — typed, per-property | KVO — string key paths, single `observeValueForKeyPath:` router |
| View tree injection | `@EnvironmentObject` (type-keyed, property wrapper) | Manual `NSObject` property passing or `UIAppearance` |
| Code organisation | Protocols + structs + actors — language features, no framework | Delegates + singletons — idioms, not language |
| Generics | Reified (preserved at runtime) | Lightweight (compile-time only, erased at runtime) |

ObjC relied on delegate protocols and singletons because it had no value types, no generics, and no closures that could express DI without ceremony. Swift's type system did not add new patterns so much as make the existing good patterns the path of least resistance.

## What's next

You can now recognise how Swift's protocols, value types, and structured concurrency reshape the iOS patterns you will encounter in Apple SDKs and production code. The next page covers **testing** — leveraging Swift's type system for test doubles, async test methods, and the Swift Testing framework.

**Next** → [Testing Swift code](./13-testing-swift-code.md)
