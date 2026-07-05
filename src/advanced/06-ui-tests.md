---
title: UI tests
tier: advanced
platform: ios
position: 6
---

# UI tests

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Advanced › UI tests

**Goal**

Add an XCUITest target that launches the app, signs in, taps a favorite, and navigates to the detail screen. Tests run on the simulator and verify user-visible behavior.

**Prerequisites**

- [Unit tests](./05-unit-tests.md)

## Create the UI test target

In Xcode: File → New → Target → **UI Testing Bundle**. Name it `ListAppUITests`.

XCUITest launches your app and drives it through the Accessibility hierarchy. Every button, label, and cell must have an accessibility identifier for tests to find them.

## Add accessibility identifiers

Update your views with `.accessibilityIdentifier`:

```swift
// In the List row:
Button(item.isFavorite ? "★" : "☆") {
    vm.toggleFavorite(item)
}
.accessibilityIdentifier(item.isFavorite ? "favorite-on" : "favorite-off")

// In SignInView:
SignInWithAppleButton(...)
    .accessibilityIdentifier("sign-in-button")

// Sign out button:
Button("Sign Out") { TokenManager.shared.signOut() }
    .accessibilityIdentifier("sign-out-button")
```

## UI tests

Create `ListAppUITests.swift`:

```swift
import XCTest

final class ListAppUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    func testSignInPromptAppears() {
        // The sign-in sheet should appear on first launch
        let signInButton = app.buttons["sign-in-button"]
        XCTAssertTrue(signInButton.waitForExistence(timeout: 5))
    }

    func testListLoadsAfterSignIn() {
        // Dismiss the sign-in sheet (simulate signed-in state)
        let signInButton = app.buttons["sign-in-button"]
        if signInButton.exists {
            signInButton.tap()
        }

        // Wait for the list to populate
        let list = app.collectionViews.firstMatch
        XCTAssertTrue(list.waitForExistence(timeout: 10))
        XCTAssertGreaterThan(list.cells.count, 0)
    }

    func testToggleFavorite() {
        // Sign in
        let signInButton = app.buttons["sign-in-button"]
        if signInButton.exists { signInButton.tap() }

        let list = app.collectionViews.firstMatch
        XCTAssertTrue(list.waitForExistence(timeout: 10))

        // Tap the first favorite button
        let favOff = app.buttons["favorite-off"]
        if favOff.exists {
            favOff.tap()
            let favOn = app.buttons["favorite-on"]
            XCTAssertTrue(favOn.waitForExistence(timeout: 2))
        }
    }

    func testSignOut() {
        // Sign in first
        app.buttons["sign-in-button"].tapIfExists()

        // Tap sign out
        let signOut = app.buttons["sign-out-button"]
        XCTAssertTrue(signOut.waitForExistence(timeout: 5))
        signOut.tap()

        // Sign-in prompt reappears
        XCTAssertTrue(app.buttons["sign-in-button"].waitForExistence(timeout: 3))
    }
}

extension XCUIElement {
    /// Tap the element if it exists and is hittable, within a short timeout.
    func tapIfExists(timeout: TimeInterval = 3) {
        if waitForExistence(timeout: timeout) && isHittable {
            tap()
        }
    }
}
```

## Run UI tests

```bash
xcodebuild test \
  -scheme ListApp \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -testPlan ListAppUITests
```

Or in Xcode: hold the **Test** button (▶) → choose the UI test plan.

## Checkpoint

All UI tests pass: sign-in sheet appears, list loads after sign-in, favorite toggle works, and sign-out returns to the sign-in prompt.

**Next:** [CI/CD with GitHub Actions](./07-ci-cd-github-actions.md) — automate builds, tests, and archiving.
