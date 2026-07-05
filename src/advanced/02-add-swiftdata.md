---
title: Add SwiftData
tier: advanced
platform: ios
position: 2
---

# Add SwiftData

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Advanced › Add SwiftData

**Goal**

Define `@Model` classes, replace the URLSession-only ViewModel with one that persists to SwiftData, and verify data survives app restarts.

**Prerequisites**

- [Why SwiftData](./01-why-swiftdata.md)

## Define the model

Create a new Swift file `CachedItem.swift`:

```swift
import Foundation
import SwiftData

@Model
final class CachedItem {
    var id: Int
    var title: String
    var detail: String
    var isFavorite: Bool
    var cachedAt: Date

    init(id: Int, title: String, detail: String) {
        self.id = id
        self.title = title
        self.detail = detail
        self.isFavorite = false
        self.cachedAt = .now
    }
}
```

The `@Model` macro makes the class observable by SwiftData. Every stored property becomes a column in the underlying SQLite database.

## SwiftData-backed ViewModel

Replace the intermediate `ObservableObject` ViewModel with one that loads from SwiftData first, then refreshes from the network:

```swift
import SwiftUI
import SwiftData

@MainActor
@Observable
final class ItemViewModel {
    private var modelContext: ModelContext

    var items: [CachedItem] = []
    var isLoading = false
    var error: Error?

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    func load() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        // 1. Load cached items immediately
        let descriptor = FetchDescriptor<CachedItem>(
            sortBy: [SortDescriptor(\.id)]
        )
        items = (try? modelContext.fetch(descriptor)) ?? []

        // 2. Refresh from network
        do {
            let remote = try await fetchRemoteItems()
            // Merge: keep favorites, update titles/details
            for remoteItem in remote {
                if let existing = items.first(where: { $0.id == remoteItem.id }) {
                    existing.title = remoteItem.title
                    existing.detail = remoteItem.detail
                } else {
                    let new = CachedItem(id: remoteItem.id,
                                         title: remoteItem.title,
                                         detail: remoteItem.detail)
                    modelContext.insert(new)
                    items.append(new)
                }
            }
            try modelContext.save()
        } catch {
            // Network failed — cached items still available
            self.error = error
        }
    }

    func toggleFavorite(_ item: CachedItem) {
        item.isFavorite.toggle()
        try? modelContext.save()
    }

    private func fetchRemoteItems() async throws -> [(id: Int, title: String, detail: String)] {
        // Same URLSession call as the intermediate tier
        let url = URL(string: "https://jsonplaceholder.typicode.com/posts")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([RemoteItem].self, from: data)
            .map { (id: $0.id, title: $0.title, detail: $0.body) }
    }
}

private struct RemoteItem: Decodable {
    let id: Int
    let title: String
    let body: String
}
```

## Update ContentView

```swift
import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel: ItemViewModel?

    var body: some View {
        Group {
            if let vm = viewModel {
                List(vm.items, id: \.id) { item in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(item.title).font(.headline)
                            Text(item.detail).font(.caption)
                        }
                        Spacer()
                        Button(item.isFavorite ? "★" : "☆") {
                            vm.toggleFavorite(item)
                        }
                    }
                }
                .overlay {
                    if vm.isLoading { ProgressView() }
                }
                .task { await vm.load() }
            } else {
                ProgressView()
            }
        }
        .onAppear {
            viewModel = ItemViewModel(modelContext: modelContext)
        }
    }
}
```

## Checkpoint

Run the app in the simulator. The first launch fetches from the network and caches items. Tap a star to favorite it. Stop the app (Cmd+Q) and relaunch — the favorite persists and cached data loads immediately without a network spinner.

**Next:** [Sign in with Apple](./03-sign-in-with-apple.md) — authenticate users with their Apple ID.
