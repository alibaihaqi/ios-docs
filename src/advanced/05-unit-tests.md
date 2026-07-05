---
title: Unit tests
tier: advanced
platform: ios
position: 5
---

# Unit tests

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Advanced › Unit tests

**Goal**

Write XCTest unit tests for the ViewModel, the SwiftData model, and the Keychain service. Use an in-memory SwiftData container so tests are fast and isolated.

**Prerequisites**

- [Secure token storage](./04-secure-token-storage.md)

## Create the test target

In Xcode: File → New → Target → **Unit Testing Bundle**. Name it `ListAppTests`. Xcode creates `ListAppTests.swift`.

## In-memory SwiftData container

For tests, use a `ModelContainer` backed by an in-memory store (no data written to disk):

```swift
@MainActor
func makeContainer() -> ModelContainer {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    return try! ModelContainer(for: CachedItem.self, configurations: config)
}
```

## Test the ViewModel

```swift
import XCTest
import SwiftData
@testable import ListApp

final class ItemViewModelTests: XCTestCase {
    @MainActor
    func testToggleFavorite() throws {
        let container = makeContainer()
        let context = container.mainContext
        let vm = ItemViewModel(modelContext: context)

        let item = CachedItem(id: 1, title: "Test", detail: "Detail")
        context.insert(item)

        XCTAssertFalse(item.isFavorite)
        vm.toggleFavorite(item)
        XCTAssertTrue(item.isFavorite)
        vm.toggleFavorite(item)
        XCTAssertFalse(item.isFavorite)
    }

    @MainActor
    func testLoadRestoresCache() async throws {
        let container = makeContainer()
        let context = container.mainContext
        let vm = ItemViewModel(modelContext: context)

        // Seed cached data
        let item = CachedItem(id: 42, title: "Cached", detail: "Offline")
        context.insert(item)

        await vm.load()

        // Cache loaded immediately, even if network fails
        XCTAssertFalse(vm.items.isEmpty)
        XCTAssertTrue(vm.items.contains(where: { $0.id == 42 }))
    }
}
```

## Test the Keychain wrapper

Keychain access works in unit tests (the test host is the app). Test that stored data survives the Keychain round-trip:

```swift
final class KeychainServiceTests: XCTestCase {
    override func setUp() {
        KeychainService.delete(key: "test_key")
    }

    func testStoreAndRead() {
        let input = "secret-token".data(using: .utf8)!
        KeychainService.store(key: "test_key", data: input)
        let output = KeychainService.read(key: "test_key")
        XCTAssertEqual(input, output)
    }

    func testDelete() {
        KeychainService.store(key: "test_key", data: Data("x".utf8))
        KeychainService.delete(key: "test_key")
        XCTAssertNil(KeychainService.read(key: "test_key"))
    }
}
```

## Run tests

```bash
# Command line (from the project directory):
xcodebuild test \
  -scheme ListApp \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -testPlan ListAppTests
```

Or press **Cmd+U** in Xcode.

## Checkpoint

All tests pass (green checkmarks). Test results show 3+ test cases: toggle toggles correctly, cached items survive load, Keychain round-trips data.

**Next:** [UI tests](./06-ui-tests.md) — XCUITest for navigation flows.
