# Changelog

All notable changes to the iOS learning-docs site. Newest first.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

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
