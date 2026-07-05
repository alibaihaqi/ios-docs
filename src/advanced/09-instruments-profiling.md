---
title: Instruments profiling
tier: advanced
platform: ios
position: 9
---

# Instruments profiling

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Advanced › Instruments profiling

**Goal**

Use Xcode's Instruments to profile the app — capture a Time Profiler trace, find slow code, and detect memory leaks with the Leaks instrument.

**Prerequisites**

- [Push notifications](./08-push-notifications.md)

## Launch Instruments

Three ways to start:

1. **Xcode:** Product → Profile (Cmd+I) → choose a template
2. **Terminal:** `xcrun instruments` (CLI mode)
3. **Standalone:** Open Instruments.app from Xcode → Open Developer Tool

## Time Profiler

The Time Profiler samples the call stack every 1ms and shows which functions consume the most CPU time.

### Common findings in a SwiftUI app

| Symptom | Likely cause |
|---------|-------------|
| High `body` evaluation time | Unnecessary view recomputation — add `EquatableView` or `@ViewBuilder` |
| `JSONDecoder.decode` at top | Fetching and decoding on the main actor — move to background `Task` |
| `modelContext.save()` spikes | Saving after every toggle — batch saves or debounce |

### Profile the list

1. Select **Time Profiler** template
2. Tap the record button (red circle)
3. Scroll through the list several times
4. Stop recording

The call tree shows that `ItemViewModel.load()` and `JSONDecoder.decode(_:from:)` are the top consumers. This confirms you should fetch on a background actor.

## Fix: move network fetch to a ModelActor

Create `DataFetcher.swift`:

```swift
import SwiftData

@ModelActor
actor DataFetcher {
    func fetchAndCache() async throws {
        let url = URL(string: "https://jsonplaceholder.typicode.com/posts")!
        let (data, _) = try await URLSession.shared.data(from: url)
        let remote = try JSONDecoder().decode([RemoteItem].self, from: data)

        for item in remote {
            let descriptor = FetchDescriptor<CachedItem>(
                predicate: #Predicate { $0.id == item.id }
            )
            if try modelContext.fetch(descriptor).first == nil {
                modelContext.insert(
                    CachedItem(id: item.id, title: item.title, detail: item.body)
                )
            }
        }
        try modelContext.save()
    }
}
```

Call it from the ViewModel:

```swift
let fetcher = DataFetcher(modelContainer: modelContainer)
try await fetcher.fetchAndCache()
```

Profile again — the main thread CPU drops significantly.

## Leaks instrument

1. Select the **Leaks** template
2. Record, then navigate through the app: sign in, favorite items, sign out, sign in again
3. Stop

The Leaks instrument shows a timeline. Any red bars indicate leaked memory. Click a leak to see the retain cycle:

- Typical SwiftUI leak: a closure capturing `self` strongly in a view modifier.
- Fix: use `[weak self]` in escaping closures, or prefer `@Observable` over `ObservableObject`.

## Memory Graph Debugger

For a quick ad-hoc check without Instruments:

1. Run the app in Xcode
2. Press the **Memory Graph Debugger** button (the three diamonds in the debug bar)
3. Search for objects that should have been deallocated after a navigation pop

## Checkpoint

- Time Profiler: network fetch no longer appears on the main thread.
- Leaks: zero red bars after 2 minutes of navigation.
- Memory Graph: no orphaned view models.

**Next:** [TestFlight distribution](./10-testflight-distribution.md) — archive, export, and submit to App Store Connect.
