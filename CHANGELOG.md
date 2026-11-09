# Changelog

All notable changes to the iOS learning-docs site. Newest first.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## 2026-11-09 — chore: bump Node 26.4.0 -> 26.12.1

### Changed
- `.node-version` (and any hardcoded CI `node-version`) bumped 26.4.0 -> 26.12.1 for upstream Node security fixes.

## 2026-08-08 — fix: footer copyright year

### Fixed
- Footer copyright bumped `2023 - Present` -> `2026 - Present`.

## 2026-07-07 — feat: add Objective-C and Swift language deep-dive sections

### Added
- **Objective-C** (12 pages): history, syntax, classes/memory, categories/protocols, Foundation, blocks, UIKit, error handling, KVO, ObjC-Swift interop, testing.
- **Swift** (14 pages): design, types, functions/closures, structs/classes, enums, protocols, generics, error handling, property wrappers/result builders, concurrency, SPM, iOS patterns, testing, interop.
- Both sections placed after Advanced in sidebar as standalone language references.

### Changed
- **Removed `ignoreDeadLinks: true`** from config — the 26 new pages all exist, so dead links are now real issues caught at build time.

## 2026-07-08 — Swift section pages 01–04

### Added
- **Swift deep-dive pages 01–04** (`src/swift/`): begins the 14-page Swift
  language reference.
  - `01-why-swift.md` — the "Safe, fast, expressive" design philosophy with
    concrete compiler-enforcement examples, the full 1.0→6.0 history timeline,
    why ABI stability (Swift 5) was a milestone, where Swift excels vs ObjC,
    the ecosystem (SwiftUI, Vapor, SPM, Swift Testing, macros), open-source
    status, and a Swift-vs-ObjC comparison table.
  - `02-types-and-optionals.md` — value vs reference types, `Optional<Wrapped>`
    as the enum behind `?`, optional binding (`if let` / `guard let` with
    multiple bindings + the `where`→comma SE-0099 note), nil-coalescing,
    optional chaining, `try?`, implicitly-unwrapped optionals history, type
    inference, and Codable/network practical examples.
  - `03-functions-and-closures.md` — argument labels vs parameter names per
    API guidelines, default/variadic/`inout` parameters, tuple and `Never`
    returns, closures (full, trailing, multiple-trailing 5.3+, shorthand
    `$0`, capture lists `[weak self]`/`[unowned self]`/`[value]`, `@escaping`),
    a `Result`-based network fetch example, and a closures-vs-ObjC-blocks table.
  - `04-structs-and-classes.md` — struct vs class distinction, memberwise
    initializer (and the extension-doesn't-suppress-it rule), `mutating`,
    designated vs convenience initializers, failable `init?`, `final`, `===`
    identity, copy-on-write, the struct-by-default decision tree, a full `User`
    struct-vs-class example, and an ObjC comparison.

## 2026-07-07 — Objective-C section pages 09–12

### Added
- **Objective-C deep-dive pages 09–12** (`src/objective-c/`): completes the
  12-page ObjC language reference.
  - `09-error-handling.md` — the `NSError **` double-pointer out-parameter
    pattern, the three parts of `NSError` (domain/code/userInfo), authoring
    error-vending methods, `NSUnderlyingErrorKey` wrapping, `@try`/`@catch`
    scope, and the Swift `throws`/`catch` comparison.
  - `10-kvo-notificationcenter.md` — KVO registration + the `context` pointer
    discipline, automatic vs manual notification, `dealloc` removal, the
    `NSNotificationCenter` selector + block APIs, when-to-use-what matrix
    (delegate vs KVO vs NotificationCenter vs blocks), and a full KVO example.
  - `11-objc-swift-interop.md` — bridging header, `@objc`/`@objcMembers`,
    what cannot cross the boundary, `NS_ASSUME_NONNULL_BEGIN/END` audit regions,
    lightweight generics, `NS_SWIFT_NAME`/`NS_REFINED_FOR_SWIFT`,
    `#selector`/`#keyPath`, and a mixed-source `DataManager` + Swift VC example.
  - `12-testing-objective-c.md` — XCTest target setup, `XCTestCase`
    structure, the `XCTAssert*` macros (incl. `Equal` vs `EqualObjects`),
    delegate-callback test doubles, `XCTestExpectation` for async, protocol-based
    mocking, OCMock mention, and `xcodebuild test`.

## 2026-07-05 — Advanced tier

### Added
- **Advanced tier** (`src/advanced/`, 10 pages + index): extends the intermediate MVVM list into a production-ready iOS app — SwiftData persistence, Sign in with Apple, Keychain token storage, unit tests (XCTest), UI tests (XCUITest), CI/CD (GitHub Actions), push notifications (APNs), Instruments profiling, and TestFlight distribution. Wired into the sidebar, nav, and home feature card.

## 2026-07-04 — Intermediate tier + CI

### Added
- **Intermediate tier** (`src/intermediate/`, 6 pages): extends the beginner
  one-screen SwiftUI list into an MVVM app — an `ObservableObject` view model
  publishing loading/loaded/error state, async loading via `URLSession`
  (`async/await`) against the public keyless jsonplaceholder API, and a
  `NavigationStack` detail screen. Wired into the sidebar, nav, and home feature
  card.
- **`CLAUDE.md`** — public-safe repo conventions (tier/ladder pattern,
  frontmatter schema, add-a-page/tier steps, build commands, no-secrets rule).

### Changed
- **CI:** pinned Node to `26.4.0` (`.node-version` + `deploy` workflow).

## 2026-06 — Beginner tier + refresh

### Added
- **Beginner tier**: numbered ladder building one SwiftUI screen rendering a
  hard-coded array in a scrollable list (Xcode + Simulator).
- Hub back-link on the home page.

### Changed
- Migrated the build from yarn to pnpm; bumped VitePress to 1.6.4; bumped
  deprecated GitHub Actions.

## 2023 — Initial documentation

### Added
- Initial iOS docs site (VitePress): project scaffold, base config, and landing
  page; deploy workflow to GitHub Pages.
