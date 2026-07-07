---
title: Testing ObjC code
tier: objective-c
platform: ios
---

# Testing ObjC code

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › Testing ObjC code

**Goal**

You will write unit tests for Objective-C code using **XCTest** — the testing framework that ships with Xcode and underpins every iOS test target. You will set up a test target, structure an `XCTestCase` with `setUp`/`tearDown`, use the `XCTAssert*` assertion macros, test delegate callbacks with a test double, test asynchronous code with `XCTestExpectation`, and apply protocol-based mocking without a third-party framework. After this page you can test any ObjC class and understand why Swift — with structs, protocols, and `@testable` — needs mocking frameworks far less.

**Prerequisites**

- [11 ObjC-Swift interop](./11-objc-swift-interop.md)

## Setting up a test target

A test target is a separate bundle that links against your app or framework and runs under the test host. To create one in Xcode: **File → New → Target… → iOS → Unit Testing Bundle**. Name it `MyAppTests`, set the host application to your app, and Xcode generates:

- A folder `MyAppTests/` with an `Info.plist` and a starter `MyAppTests.m`.
- A scheme that runs `xcodebuild test` against the target.

The test target imports your app's headers. For an app target, the bridging-header approach works (`#import "MyClass.h"`); for a framework, `@testable import` (Swift) or `@import MyFramework;` (modules) is preferred. Tests live in `.m` files — one `XCTestCase` subclass per class under test is the common granularity.

## An XCTestCase subclass

The structure is fixed: a subclass of `XCTestCase`, `setUp`/`tearDown` pair, and any number of `test…` methods.

```objc
#import <XCTest/XCTest.h>
#import "Person.h"

@interface PersonTests : XCTestCase
@end

@implementation PersonTests

- (void)setUp {
    [super setUp];
    // Runs before each test method. Put shared setup here.
}

- (void)tearDown {
    // Runs after each test method. Put cleanup here.
    [super tearDown];
}

- (void)testPersonInitializesWithName {
    Person *person = [[Person alloc] initWithName:@"Alice" age:30];
    XCTAssertEqualObjects(person.name, @"Alice");
    XCTAssertEqual(person.age, 30);
}

@end
```

Key facts:

- `setUp` runs **before each** `test…` method (not once per class). Each test gets a fresh fixture — that isolation is what makes test order irrelevant. Call `[super setUp]` first.
- `tearDown` runs **after each** test method. Call `[super tearDown]` last.
- A test method must return `void`, take no parameters, and **start with `test`** — that prefix is how the runtime discovers it. `testPersonInitializesWithName` runs; `verifyPerson` does not.
- Failures are reported with the file/line of the failing assertion and the optional description string.

## The XCTAssert* macros

XCTest's assertions are C macros that record a failure (and usually abort the test method) when the condition is false. The core set:

| Macro | Passes when |
|---|---|
| `XCTAssert(expr, desc)` | `expr` is true (generic). |
| `XCTAssertTrue(expr, desc)` | `expr` is true (explicit, clearer intent). |
| `XCTAssertFalse(expr, desc)` | `expr` is false. |
| `XCTAssertEqual(a, b, desc)` | `a == b` — scalar comparison (`int`, `NSInteger`, `BOOL`, pointers). |
| `XCTAssertEqualObjects(a, b, desc)` | `[a isEqual:b]` — object comparison. Use this for `NSString`, `NSNumber`, `NSArray`. |
| `XCTAssertNotEqual(a, b, desc)` / `XCTAssertNotEqualObjects(a, b, desc)` | The negations. |
| `XCTAssertNil(a, desc)` | `a == nil`. |
| `XCTAssertNotNil(a, desc)` | `a != nil`. |
| `XCTAssertTrueWithError(expr, err)` | `expr` true; records detail in `NSError *err` on failure. |
| `XCTFail(desc)` | Always fails — use to mark an unreachable branch or an incomplete test. |
| `XCTSkip(desc)` | Skips the test (Xcode 11+); for a test that cannot run in this environment. |

The `desc` argument is optional (`@"…"`). Always provide it for a non-obvious assertion — when it fails, the message tells you *which* assertion and *why* without re-reading the test.

::: warning XCTAssertEqual vs XCTAssertEqualObjects
The most common assertion bug. `XCTAssertEqual` compares `==` — for objects that's **pointer identity**, not value equality. `XCTAssertEqualObjects(person.name, @"Alice")` calls `isEqual:` and is almost always what you want for `NSString` / `NSNumber` / collections. `XCTAssertEqual(person.age, 30)` is correct for the `NSInteger` scalar. The compiler will sometimes warn, but not always — pick the macro by the *type*, not the value.
:::

A more complete example exercising several macros:

```objc
- (void)testPersonGreetsByName {
    Person *person = [[Person alloc] initWithName:@"Bob" age:25];
    NSString *greeting = [person greeting];

    XCTAssertNotNil(greeting);
    XCTAssertTrue([greeting hasPrefix:@"Hello, "]);
    XCTAssertEqualObjects(greeting, @"Hello, Bob");
    XCTAssertNotEqualObjects(greeting, @"Hello, Alice");
}
```

## Testing delegate callbacks

A delegate callback is an outbound call from an object to its delegate — you cannot assert on it directly because you don't control the timing. The pattern: write a **test double** — a small class that conforms to the protocol, records what it received, and lets the test inspect the recording.

Given a `Downloader` with a delegate:

```objc
// Downloader.h
@protocol DownloaderDelegate <NSObject>
- (void)downloader:(Downloader *)downloader didFinishWithData:(NSData *)data;
@end

@interface Downloader : NSObject
@property (nonatomic, weak) id<DownloaderDelegate> delegate;
- (void)startWithURL:(NSURL *)url;
@end
```

The test double and the test:

```objc
// TestDouble — conforms to the protocol, records calls.
@interface RecordingDownloaderDelegate : NSObject <DownloaderDelegate>
@property (nonatomic, strong) NSData *receivedData;
@property (nonatomic) BOOL didFinish;
@end

@implementation RecordingDownloaderDelegate
- (void)downloader:(Downloader *)downloader didFinishWithData:(NSData *)data {
    self.receivedData = data;
    self.didFinish = YES;
}
@end

// The test
- (void)testDownloaderCallsDelegateOnFinish {
    RecordingDownloaderDelegate *spy = [[RecordingDownloaderDelegate alloc] init];
    Downloader *downloader = [[Downloader alloc] init];
    downloader.delegate = spy;

    [downloader startWithURL:[NSURL URLWithString:@"https://example.com/data"]];

    // If startWithURL: is synchronous, we can assert immediately:
    XCTAssertTrue(spy.didFinish, @"delegate should have been called");
    XCTAssertNotNil(spy.receivedData);
}
```

This is the canonical ObjC test-double shape: a stub object that conforms to the protocol and exposes state for assertions. No framework needed — it's a normal class in the test target.

## Testing async code with XCTestExpectation

When the code under test calls back asynchronously (a background queue, a network completion), you cannot assert right after calling it — the callback hasn't run yet. `XCTestExpectation` is the primitive: create one, fulfill it inside the callback, then wait for it with a timeout.

```objc
- (void)testAsyncCompletion {
    XCTestExpectation *expectation =
        [self expectationWithDescription:@"Network call completes"];

    [service fetchWithCompletion:^(NSData *result, NSError *error) {
        XCTAssertNotNil(result, @"result should not be nil on success");
        XCTAssertNil(error);
        [expectation fulfill];   // signal the wait is over
    }];

    // Block the test until the expectation is fulfilled or 5s elapses.
    [self waitForExpectations:@[expectation] timeout:5.0];

    // After waitForExpectations returns, assertions inside the block have run.
}
```

Rules:

- Create one expectation per async callback you wait for (`expectationWithDescription:`).
- Call `[expectation fulfill]` **exactly once** — inside the callback, after your assertions. Fulfilling more than once is a test failure; not fulfilling at all times out.
- `[self waitForExpectations:timeout:]` blocks the test thread. If the timeout elapses without fulfillment, the test fails with "Asynchronous wait failed."
- For multiple parallel callbacks, create multiple expectations and pass them all in one `waitForExpectations:timeout:` array, or use `-[XCTestExpectation fulfill]` from each.
- The description string shows up in the failure report — make it specific ("login callback fires") not generic ("expectation").

The weak/strong dance applies if the callback captures `self` and the test object outlives it — though for short tests where the expectation is fulfilled before the test method returns, the cycle is usually short-lived enough to ignore.

## Mocking without a framework

ObjC's dynamic dispatch makes several mocking techniques possible without a library:

### Protocol-based mocks (preferred)

Define the dependency behind a protocol, then in tests substitute a fake conforming to it. This is the same test-double pattern as the delegate above, generalized to any dependency:

```objc
// Production: NetworkClient talks to a real URLSession.
@protocol DataFetching <NSObject>
- (void)fetchURL:(NSURL *)url completion:(void (^)(NSData * _Nullable, NSError * _Nullable))completion;
@end

@interface NetworkClient : NSObject
- (instancetype)initWithFetcher:(id<DataFetching>)fetcher;
- (void)loadProfileForID:(NSString *)userID completion:(void (^)(NSError * _Nullable))completion;
@end

// Test: FakeFetcher returns canned data.
@interface FakeFetcher : NSObject <DataFetching>
@property (nonatomic, strong) NSData *stubbedData;
@property (nonatomic, strong) NSError *stubbedError;
@end

@implementation FakeFetcher
- (void)fetchURL:(NSURL *)url completion:(void (^)(NSData * _Nullable, NSError * _Nullable))completion {
    completion(self.stubbedData, self.stubbedError);
}
@end

// The test injects the fake.
- (void)testLoadProfileParsesData {
    FakeFetcher *fake = [[FakeFetcher alloc] init];
    fake.stubbedData = [@"{\"name\":\"Alice\"}" dataUsingEncoding:NSUTF8StringEncoding];

    NetworkClient *client = [[NetworkClient alloc] initWithFetcher:fake];
    XCTestExpectation *exp = [self expectationWithDescription:@"profile loaded"];

    [client loadProfileForID:@"1" completion:^(NSError *error) {
        XCTAssertNil(error);
        [exp fulfill];
    }];
    [self waitForExpectations:@[exp] timeout:2.0];
}
```

This is the dependency-injection pattern that makes ObjC testable: depend on a protocol, inject the real one in production and a fake in tests.

### Partial mocks via category override (fragile)

You can override a method in a class *for the duration of a test* by adding a category that swizzles or replaces it. This works but is fragile — it mutates global class state, leaks across tests if not torn down, and breaks under subclassing. Use only when you cannot inject a protocol (e.g. stubbing a Foundation class you don't own). Prefer the protocol approach.

## OCMock and third-party frameworks

**OCMock** is the dominant ObjC mocking library. It builds mock objects that conform to arbitrary protocols, stub specific methods to return canned values, and verify expected calls. The appeal is less boilerplate than hand-written fakes:

```objc
id<DataFetching> mockFetcher = OCMStrictProtocolMock(@protocol(DataFetching));
OCMStub([mockFetcher fetchURL:OCMOCK_ANY completion:([OCMArg invokeBlockWithArgs:stubbedData, nil])]);
```

In practice, modern ObjC codebases increasingly skip OCMock in favor of hand-written protocol fakes — they're clearer, debuggable, and don't depend on runtime swizzling that breaks as the language evolves. Swift's structs and protocols make hand-rolled fakes trivial, and OCMock is entirely unused in Swift (it depends on the ObjC runtime). Reach for OCMock only when stubbing a class you cannot put behind a protocol.

## Running tests

- **In Xcode:** `Cmd+U` runs the active scheme's test action. Use the test navigator (Cmd+6) to run a single test or a single class by clicking the diamond next to it.
- **From the command line:** `xcodebuild test -workspace MyApp.xcworkspace -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15'`. This is what CI runs.
- **Filtering:** `-only-testing:MyAppTests/PersonTests/testPersonInitializesByName` runs a single test method.
- **Parallelism:** test targets run in parallel by default on Xcode 10+; control with `-parallel-testing-enabled YES|NO`.

A green test run prints `** TEST SUCCEEDED **` and exits 0; any failure prints the failing assertion, file, and line, and exits non-zero. CI treats a non-zero exit as a build failure.

## What's next

You can now test any Objective-C class — synchronous logic with assertions, delegate callbacks with a test double, and async code with expectations. This is the end of the Objective-C section: you've gone from syntax foundations through classes, memory, categories, protocols, Foundation, blocks, UIKit, error handling, observation, Swift interop, and testing — the complete vocabulary you need to read, maintain, and extend any Objective-C codebase.

You've completed the Objective-C section. Explore the [Swift section](../swift/) to see the same concepts in a modern language — optionals, value types, protocol-oriented programming, `async/await`, and the patterns that replaced everything you just learned.
