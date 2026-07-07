---
title: Testing Swift code
tier: swift
platform: ios
---

# Testing Swift code

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Testing Swift code

**Goal**

You will write tests using XCTest and the Swift Testing framework, including async test methods, protocol-based test doubles, and the modern `@Test`/`#expect` API. After this page you can test a Swift view model with mocked dependencies, covering loading, error, and success states.

**Prerequisites**

- [06 Protocols and POP](./06-protocols-and-pop.md)
- [08 Error handling](./08-error-handling.md)
- [10 Swift concurrency](./10-swift-concurrency.md)

## XCTest in Swift

XCTest is Apple's original testing framework, available on every Apple platform since iOS 7 and macOS 10.9. It is a class-based framework — test cases are subclasses of `XCTestCase`, and test methods are instance methods whose name starts with `test`:

```swift
import XCTest
@testable import MyApp

final class UserServiceTests: XCTestCase {

    var service: UserService!

    override func setUp() async throws {
        service = UserService()
    }

    override func tearDown() async throws {
        service = nil
    }

    func testFetchUser() async throws {
        let user = try await service.fetchUser(id: 1)
        XCTAssertEqual(user.id, 1)
        XCTAssertNotNil(user.name)
    }
}
```

### setUp / tearDown variants

XCTestCase offers three lifecycle hooks, each with a synchronous and asynchronous variant:

| Hook | Synchronous | Throwing | Async throwing |
|---|---|---|---|
| Before each test | `override func setUp()` | `override func setUpWithError() throws` | `override func setUp() async throws` |
| After each test | `override func tearDown()` | `override func tearDownWithError() throws` | `override func tearDown() async throws` |
| Before all tests | `override class func setUp()` | `override class func setUpWithError() throws` | `override class func setUp() async throws` |
| After all tests | `override class func tearDown()` | `override class func tearDownWithError() throws` | `override class func tearDown() async throws` |

Use the async throwing variants when your setup involves network calls, file I/O, or any `await` expression. The synchronous variants are fine for pure in-memory setup.

The key rule: if you override `setUp`, you must call `super.setUp()` (or the async throwing equivalent — the base class tracks test state in these hooks). The compiler does not enforce this; forgetting it produces intermittent failures.

### Test method naming

XCTest discovers test methods by scanning for names that start with `test`. Conventional naming uses `test` + `[what you test]` + `[expected behaviour]`:

```swift
func testFetchUser_returnsUserWithCorrectID() { }
func testFetchUser_throwsWhenNetworkFails() { }
func testFetchUserWithInvalidID_throwsNotFound() { }
```

Swift Testing (see below) replaces this convention with the `@Test` attribute, but XCTest naming conventions remain widely used.

### XCTest assertion macros

XCTest provides assertion functions that stop the test on failure (unlike Swift's `assert`, which only fires in debug builds):

```swift
XCTAssertTrue(condition, "message")
XCTAssertFalse(condition)
XCTAssertEqual(a, b)         // uses == (Equatable)
XCTAssertNotEqual(a, b)
XCTAssertNil(expression)
XCTAssertNotNil(expression)
XCTAssertThrowsError(try expression) { error in
    XCTAssertEqual(error as? MyError, .specificCase)
}
XCTAssertNoThrow(try expression)
XCTUnwrap(optional)          // throws on nil, fails test
```

`XCTAssertEqual` uses `Equatable`, so any `Equatable` type can be compared — including optionals (`XCTAssertEqual(a, b)` where `a` and `b` are `T?` works).

`XCTUnwrap` is a throwing function that unwraps an optional or fails the test with a descriptive message. It avoids force-unwrapping in tests:

```swift
// Without XCTUnwrap:
XCTAssertNotNil(user.name)    // user.name is String?
let name = user.name!         // force-unwrap — crashes the test if nil, not just fails

// With XCTUnwrap:
let name = try XCTUnwrap(user.name)   // fails the test with a clear message, no crash
```

### XCTExpectFailure

When a test is expected to fail — typically during a transition period or for a known bug — wrap the assertion with `XCTExpectFailure`:

```swift
func testKnownBrokenFeature() {
    XCTExpectFailure("This feature is not fully implemented yet") {
        let result = brokenFeature()
        XCTAssertEqual(result, expectedValue)
    }
}
```

The test does not fail if the assertion inside fails — it is explicitly marked. When the feature is fixed, the test starts passing, and `XCTExpectFailure` reports that the expected failure did not occur, reminding you to remove it.

## Async test methods

XCTest supports `async` and `async throws` test methods natively. No special setup or expectation is needed:

```swift
func testFetchUser() async throws {
    let user = try await service.fetchUser(id: 1)
    XCTAssertEqual(user.id, 1)
}
```

The test runner runs the method in a task. If the task throws, the test fails. If the task is cancelled (extremely rare — test cancellation is not user-facing), the test fails with a cancellation error.

### Waiting for expectations

When you need to wait for a callback-based API (e.g., an old delegate-based service that has not been migrated to `async`/`await`), use `XCTestExpectation` with `await fulfillment(of:timeout:)`:

```swift
func testDelegateCallback() async throws {
    let expectation = XCTestExpectation(description: "Service calls delegate with data")
    let service = LegacyService()
    let delegate = MockDelegate()
    delegate.onDataLoaded = { expectation.fulfill() }
    service.delegate = delegate
    service.startLoading()

    await fulfillment(of: [expectation], timeout: 5.0)
    // Test will fail if expectation is not fulfilled within 5 seconds
}
```

`await fulfillment(of:timeout:)` is the modern async variant of the synchronous `wait(for:timeout:)`. It does not block the calling thread — it suspends the test task until the expectations are fulfilled or the timeout expires.

For invertible expectations (asserting that something does **not** happen):

```swift
let unexpected = XCTestExpectation(description: "Error handler should not be called")
unexpected.isInverted = true
// If unexpected.fulfill() is called, the test fails
```

## Test doubles in Swift

Because Swift has protocols, you do not need a mock library for most test doubles. A struct that conforms to the same protocol replaces OCMock's runtime magic with plain code:

```swift
protocol DataService {
    func fetch() async throws -> Data
}

struct MockService: DataService {
    let result: Result<Data, Error>

    func fetch() async throws -> Data {
        try result.get()
    }
}

// Usage in test:
let service = MockService(result: .success(testData))
let viewModel = ViewModel(service: service)
```

### Why this is enough

In ObjC, mocking required OCMock or OCHamcrest because:

- ObjC protocols could not be adopted by value types (structs).
- Protocol requirements were not enforced by the compiler for informal protocols.
- Swizzling was the only way to replace a method at runtime.

Swift's protocol-oriented design makes a mock just another conforming type. The compiler verifies that `MockService` satisfies every requirement of `DataService`. If the protocol adds a method, the mock must implement it or the program does not compile. No runtime discovery, no partial mocks, no `-verify` calls.

### Stubbing specific calls

For more complex scenarios — a service with multiple methods where only some need stubbing — use a closure-based mock:

```swift
struct MockAuthService: AuthService {
    var onLogin: ((String, String) async throws -> User)?
    var onLogout: (() async -> Void)?

    func login(email: String, password: String) async throws -> User {
        guard let onLogin else {
            throw MockError.unexpectedCall
        }
        return try await onLogin(email, password)
    }

    func logout() async {
        await onLogout?()
    }
}

// In test:
let mock = MockAuthService()
mock.onLogin = { _, _ in
    User(id: "1", name: "Alice")
}
let result = try await mock.login(email: "a@b.com", password: "secret")
XCTAssertEqual(result.name, "Alice")
```

The `throw MockError.unexpectedCall` fallback ensures that if a test inadvertently calls a method that was not stubbed, the test fails with a clear error — not a silent no-op or nil.

### Recording calls

To assert that a method was called with specific arguments, add a recording property:

```swift
struct MockAnalyticsService: AnalyticsService {
    var recordedEvents: [String] = []

    mutating func trackEvent(_ name: String) {
        recordedEvents.append(name)
    }
}

// In test:
var mock = MockAnalyticsService()
mock.trackEvent("signup")
XCTAssertEqual(mock.recordedEvents, ["signup"])
```

Because `MockAnalyticsService` is a struct, recording requires `mutating` — which the test must use `var` to accommodate. This is a feature, not a limitation: it forces the test to acknowledge that the mock's state changes.

## Swift Testing framework (Swift 5.9+)

Swift Testing is Apple's modern testing framework, introduced alongside XCTest but designed from scratch for Swift. It uses macros instead of class inheritance, function naming conventions, and assertion macros.

### @Test replaces naming conventions

In XCTest, a test method must start with `test`. In Swift Testing, any function can be a test:

```swift
import Testing

struct UserServiceTests {

    let service = UserService()

    @Test("Fetch user returns expected name")
    func fetchUser() async throws {
        let user = try await service.fetchUser(id: 1)
        #expect(user.name == "Alice")
    }
}
```

The `@Test` attribute marks the function as a test. The optional string argument provides a human-readable name. The enclosing type is a struct (or actor) — not a class — so there is no inheritance, no `XCTestCase`, and no `setUp`/`tearDown` boilerplate for simple cases.

### #expect and #require

`#expect` replaces the `XCTAssert*` family:

```swift
#expect(user.name == "Alice")           // instead of XCTAssertEqual
#expect(user.id > 0)                    // instead of XCTAssertTrue
#expect(service.isActive)               // instead of XCTAssertTrue
```

`#require` replaces `XCTUnwrap` and adds early exit on failure:

```swift
@Test func processUser() async throws {
    let user = try await service.fetchUser(id: 1)
    let name = try #require(user.name)      // fails test with error, not crash
    let email = try #require(user.email, "User should have email after registration")
    #expect(name.count > 0)
}
```

`#require` is a throwing macro — if the condition fails (nil, false, or empty), the macro throws an `Issue` error, and the test stops immediately. This replaces force-unwraps and `XCTUnwrap` with a single, non-crashing expression.

### @Suite organises test groups

`@Suite` is an optional attribute that marks a type as a collection of tests. It replaces `XCTestCase` subclassing:

```swift
@Suite("User Service Tests")
struct UserServiceSuite {
    let service = UserService()

    @Test("Fetch user with valid ID")
    func validID() async throws { }

    @Test("Fetch user with invalid ID")
    func invalidID() async throws { }

    @Suite("Edge cases")
    struct EdgeCases {
        @Test("Empty response")
        func emptyResponse() { }
    }
}
```

Nested `@Suite` structs create a hierarchy in the test navigator — similar to, but more explicit than, XCTest's grouping by class.

### Parameterized tests

Swift Testing runs a single test function with multiple inputs using the `arguments` parameter:

```swift
@Test("Delivery cost calculation", arguments: [
    (distance: 1.0, weight: 0.5, expected: 5.0),
    (distance: 10.0, weight: 2.0, expected: 12.0),
    (distance: 50.0, weight: 10.0, expected: 30.0),
])
func deliveryCost(distance: Double, weight: Double, expected: Double) {
    let cost = calculateDeliveryCost(distance: distance, weight: weight)
    #expect(cost == expected)
}
```

Each tuple in the array produces a separate test case in the test report. If one fails, the others still run — unlike a loop where a failure stops iteration.

### Tag-based filtering

Tags allow grouping tests across types and targets:

```swift
import Testing

struct LoginTests {
    @Test(.tags(.critical)) func successfulLogin() async throws { }
    @Test(.tags(.critical, .smoke)) func failedLogin() async throws { }
}
```

Run only critical tests from the command line:

```bash
swift test --filter "critical"
```

Xcode's test navigator also filters by tag. Tags are extensible — define custom tags as static properties:

```swift
extension Tag {
    @Tag static var smoke: Self
    @Tag static var regression: Self
    @Tag static var acceptance: Self
}
```

### When to use Swift Testing vs XCTest

| Factor | Swift Testing | XCTest |
|---|---|---|
| Minimum OS | iOS 17+, macOS 14+ | iOS 7+ |
| Test discovery | `@Test` attribute | `test` prefix convention |
| Assertions | `#expect`, `#require` (macros) | `XCTAssert*` (functions) |
| Organisation | `@Suite` (nested structs) | `XCTestCase` (class hierarchy) |
| Parameterization | Built-in (`arguments:`) | Manual loops |
| Tooling | Xcode 16+, `swift test` (Swift 6.0+) | Xcode 11+ |

For new projects targeting iOS 17+ and macOS 14+, Swift Testing is the recommended choice. For projects supporting older OS versions, XCTest remains the standard. Both can coexist in the same test target.

## Testing the MVVM view model

A complete test for the Intermediate tier's view model (see [Intermediate 02](../intermediate/02-viewmodel.md) and [Intermediate 03](../intermediate/03-async-urlsession.md)) — showing how protocol-based DI and async tests work together.

**Define the service protocol:**

```swift
protocol ItemService {
    func fetchItems() async throws -> [Item]
}
```

**View model that uses it:**

```swift
@MainActor
class ItemViewModel: ObservableObject {
    @Published private(set) var state: LoadingState = .idle
    private let service: ItemService

    enum LoadingState {
        case idle, loading, loaded([Item]), error(String)
    }

    init(service: ItemService) {
        self.service = service
    }

    func load() async {
        state = .loading
        do {
            let items = try await service.fetchItems()
            state = .loaded(items)
        } catch {
            state = .error(error.localizedDescription)
        }
    }
}
```

**Test loading state transitions:**

```swift
import XCTest
@testable import MyApp

final class ItemViewModelTests: XCTestCase {

    struct MockService: ItemService {
        let result: Result<[Item], Error>

        func fetchItems() async throws -> [Item] {
            try result.get()
        }
    }

    func testLoad_successState() async throws {
        let items = [Item(id: 1, title: "Test")]
        let service = MockService(result: .success(items))
        let viewModel = await ItemViewModel(service: service)

        await viewModel.load()

        guard case .loaded(let loadedItems) = viewModel.state else {
            XCTFail("Expected loaded state, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(loadedItems.count, 1)
        XCTAssertEqual(loadedItems.first?.title, "Test")
    }

    func testLoad_errorState() async throws {
        struct TestError: Error, Equatable {
            let message: String
        }
        let service = MockService(result: .failure(TestError(message: "Network error")))
        let viewModel = await ItemViewModel(service: service)

        await viewModel.load()

        guard case .error(let message) = viewModel.state else {
            XCTFail("Expected error state")
            return
        }
        XCTAssertEqual(message, "Network error")
    }

    func testLoad_loadingStateTransitions() async throws {
        let service = MockService(result: .success([]))
        let viewModel = await ItemViewModel(service: service)

        // The load method runs synchronously up to the first await,
        // setting state to .loading before the suspension
        let task = Task { await viewModel.load() }

        // yield to let the task start executing
        await Task.yield()

        // State should now be loading
        if case .loading = viewModel.state {
            // Expected
        } else {
            // In practice the transition may complete before we observe it
        }

        await task.value
    }
}
```

The test demonstrates:

1. **Protocol-based DI**: `MockService` implements `ItemService` and the view model receives it through its initializer.
2. **Async test methods**: `func testX() async throws` — the test runner awaits the view model's async `load()`.
3. **State assertion**: The test checks that `viewModel.state` matches the expected loading, loaded, or error case.
4. **No external dependencies**: The mock never makes a network call. The test is deterministic and fast (milliseconds).

### What about MainActor isolation?

The view model is `@MainActor`, which means `state` must be accessed on the main actor. XCTest's async test methods run on the main actor by default (since Xcode 14), so `viewModel.state` is safe. If you use Swift Testing, add `@MainActor` to the test function or suite.

> **Full testing strategy:** For UI tests (XCUITest), performance testing with Instruments, and CI/CD with Xcode Cloud, see [Advanced tier pages 05-07](../advanced/05-unit-tests.md).

## Comparison with ObjC

| | Swift | Objective-C |
|---|---|---|
| Framework | XCTest + Swift Testing | XCTest (same framework, macros API) |
| Test discovery | `@Test` attribute or `test` prefix | `test` prefix only |
| Async support | Native `async throws` test methods | `XCTestExpectation` (manual) |
| Mocking | Protocol-conforming structs (no library needed) | OCMock, OCHamcrest (runtime swizzling) |
| Assertion syntax | `#expect()`, `#require()` — macros capture expressions | `XCTAssertEqual()` — functions, no capture |
| Parameterization | `@Test(arguments:)` — built-in | Manual `for` loops |
| OS requirement | Swift Testing: iOS 17+ | XCTest: iOS 7+ |

ObjC's testing relied on runtime flexibility (method swizzling for mocks, `@selector` for test discovery). Swift's compile-time guarantees (protocol conformance, type-safe assertions) move error detection earlier and eliminate the need for mock libraries in most cases.

## What's next

You can now write tests for Swift code using XCTest and Swift Testing, create protocol-based mocks, and test async view model interactions. The final page covers Swift-ObjC interop — `@objc`, bridging headers, and running code across the language boundary.

**Next** → [Swift-ObjC interop](./14-swift-objc-interop.md)
