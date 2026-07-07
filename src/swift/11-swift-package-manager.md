---
title: Swift Package Manager
tier: swift
platform: ios
---

# Swift Package Manager

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Swift › Swift Package Manager

**Goal**

You will create and read `Package.swift` manifests, add dependencies with version constraints, define library and executable products, organize targets with resources and test targets, and resolve version conflicts. After this page you can set up a multi-module Swift project and manage its dependencies with SPM — Apple's official package manager.

**Prerequisites**

- [08 Error handling](./08-error-handling.md)
- [09 Property wrappers and result builders](./09-property-wrappers-result-builders.md)

## What SPM is

Swift Package Manager (SPM) is Apple's official dependency manager, integrated into the Swift toolchain and Xcode (since Xcode 11). It replaces CocoaPods and Carthage as the recommended way to distribute and consume Swift libraries.

SPM works at three levels:

- **Source-based**: packages are Swift source code, compiled on demand.
- **Manifest-driven**: every package has a `Package.swift` manifest declaring its name, targets, dependencies, and products.
- **Graph-resolved**: dependencies are resolved into a version graph by semantic versioning, recorded in `Package.resolved`.

## Package.swift manifest structure

Every SPM package begins with a `Package.swift` file at the package root. The first line is a `// swift-tools-version` comment that declares which version of the `PackageDescription` API to use:

```swift
// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "MyLibrary",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "MyLibrary", targets: ["MyLibrary"])
    ],
    dependencies: [
        .package(url: "https://github.com/example/Package", from: "1.0.0"),
        .package(url: "https://github.com/example/AnotherPackage", exact: "2.3.1"),
        .package(path: "../LocalShared")
    ],
    targets: [
        .target(
            name: "MyLibrary",
            dependencies: [
                .product(name: "Package", package: "Package"),
                "AnotherPackage"                     // shorthand when name matches
            ],
            resources: [.process("Resources")]
        ),
        .testTarget(
            name: "MyLibraryTests",
            dependencies: ["MyLibrary"]
        )
    ]
)
```

### `// swift-tools-version`

This comment is **not** optional. It tells the `swift` toolchain which version of the `PackageDescription` module to use. Newer tool versions introduce new API (e.g., `resources`, `binaryTarget`, `executableTarget`), but the manifest must be processable by the installed Swift version:

- `// swift-tools-version: 5.9` — available from Swift 5.9 (Xcode 15+). Supports `executableTarget`, `.process` resources, and `package(path:)` for local packages.
- `// swift-tools-version: 5.6` — Swift 5.6 (Xcode 13.3+). Supports `location` on dependencies.
- `// swift-tools-version: 5.3` — Swift 5.3 (Xcode 12+). First version with resources, binary targets, and local packages.

Use the minimum version your manifest needs. Don't use `5.9` if you only need `5.6` features — lower versions are processable by more toolchains.

### Platforms

The `platforms` parameter declares which OS versions your package supports. It affects availability checks and the deployment target of the compiled product:

```swift
platforms: [
    .iOS(.v17),
    .macOS(.v14),
    .watchOS(.v10),
    .tvOS(.v17),
    .visionOS(.v1)     // Swift 5.9+
]
```

If omitted, the default is the earliest version the toolchain supports (typically iOS 9 or 11, depending on the Swift version). Always set platforms explicitly for a modern package.

### Products

A **product** is what your package publishes for other packages to consume. Two kinds:

- `.library` — a set of targets that other packages can depend on. Libraries can be `static` or `dynamic`, but in practice `.library(name:targets:)` auto-picks the linkage.
- `.executable` — a command-line executable (macOS/Linux). Built with `swift run` or `swift build`.

```swift
products: [
    .library(name: "MyLibrary", targets: ["MyLibrary"]),
    .library(name: "MyLibraryUI", targets: ["MyLibraryUI"]),
    .executable(name: "my-tool", targets: ["MyTool"])
]
```

A library product must list at least one target. Swift Package Manager exposes those targets' **public** symbols to downstream packages.

### Targets

A **target** is a module — a collection of Swift files (and optionally resources, headers, or C sources) compiled together. Four target types:

**`.target`** — a standard library module:

```swift
.target(
    name: "Core",
    dependencies: ["Models"],
    resources: [.process("Resources")],
    swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
)
```

**`.testTarget`** — a test module, only built when running `swift test`:

```swift
.testTarget(
    name: "CoreTests",
    dependencies: ["Core"],
    resources: [.copy("Fixtures")]
)
```

Test targets cannot be dependencies of non-test targets.

**`.binaryTarget`** — a pre-compiled XCFramework, for proprietary or closed-source dependencies:

```swift
.binaryTarget(
    name: "SecretSDK",
    path: "Vendored/SecretSDK.xcframework"
)
// Or from a remote URL:
.binaryTarget(
    name: "SecretSDK",
    url: "https://cdn.example.com/SecretSDK-1.2.3.xcframework.zip",
    checksum: "abc123def456789abc123def456789abc123def456789abc123def456789abc12"
)
```

Binary targets must provide a SHA-256 checksum. Generate it with:

```bash
swift package compute-checksum SecretSDK.xcframework.zip
```

**`.systemLibrary`** — wraps a system library (e.g., `libz`, `libxml2`) that you link against but don't compile:

```swift
.systemLibrary(
    name: "SystemLib",
    pkgConfig: "libsystem-lib",
    providers: [
        .brew(["libsystem-lib"]),
        .apt(["libsystem-lib-dev"])
    ]
)
```

System library targets are uncommon in pure Swift projects but essential for wrapping C libraries that lack an SPM package.

#### Target dependencies

A dependency can be specified in three ways:

```swift
// 1. String shorthand — when the package and product names match
.target(name: "Core", dependencies: ["Models"])

// 2. Product reference — when they differ
.target(name: "Core", dependencies: [
    .product(name: "SomeProduct", package: "some-package")
])

// 3. By-name — product name only, Swift resolves the package
.target(name: "Core", dependencies: ["SomeProduct"])
```

Prefer the string shorthand when the names align. Use `.product(name:package:)` when a package exposes multiple products and you want to be explicit.

### Dependencies

Dependencies are specified in the top-level `dependencies` array, referenced by targets via `dependencies`:

```swift
dependencies: [
    .package(url: "https://github.com/example/Package", from: "1.0.0"),
    .package(url: "https://github.com/example/Another", exact: "2.3.1"),
    .package(url: "https://github.com/example/BleedingEdge", branch: "main"),
    .package(url: "https://github.com/example/Specific", revision: "abc123def456"),
    .package(path: "../LocalShared")
]
```

| Constraint | Behaviour | When to use |
|---|---|---|
| `from: "1.0.0"` | ≥ 1.0.0, < 2.0.0 | Most common — "compatible with major version" |
| `"1.0.0"..<"2.0.0"` | Exact range | When you need more control than `from:` |
| `"1.2.0"...` | ≥ 1.2.0, no upper bound | Risky — upstream breaking changes will be pulled |
| `exact: "1.2.3"` | Exactly 1.2.3 | For version-pinned releases |
| `branch: "main"` | HEAD of a branch | For development / CI with a prerelease branch |
| `revision: "abc123"` | Specific commit | For a known-good point, no tag needed |
| `path: "../MyLib"` | Local filesystem path | Multi-module projects in development |

## Version resolution

SPM resolves the full dependency graph at `swift package resolve` (or the first `swift build`/`swift test`). It uses **semantic versioning** (MAJOR.MINOR.PATCH) and records the resolved versions in `Package.resolved`.

### How resolution works

1. SPM reads the root package's `Package.swift` and collects all dependencies.
2. For each dependency, it reads *its* `Package.swift` and collects transitive dependencies.
3. It builds a version graph: every version of every package that satisfies the constraints.
4. It selects the **latest compatible version** that satisfies all constraints simultaneously.

If two dependencies require incompatible versions of the same package (e.g., A needs `from: "1.0.0"` and B needs `exact: "2.0.0"`), resolution fails with a conflict error.

### `Package.resolved` — the lockfile

`Package.resolved` is a JSON file at the package root, analogous to `package-lock.json` (npm) or `Podfile.lock` (CocoaPods). It records the exact version of every dependency that `swift package resolve` settled on:

```json
{
  "originHash" : "abc123…",
  "pins" : [
    {
      "identity" : "package",
      "kind" : "remoteSourceControl",
      "location" : "https://github.com/example/Package",
      "state" : {
        "revision" : "abc123def456",
        "version" : "1.4.2"
      }
    }
  ],
  "version" : 3
}
```

- **`pin`** — the resolved version/revision for each dependency.
- **`originHash`** — a hash of the resolved graph, used for integrity checking.
- **`version`** — the lockfile format version (currently 3).

Commit `Package.resolved` to version control to ensure reproducible builds across machines. When you run `swift package update`, SPM re-resolves respecting your constraints and produces a new `Package.resolved`.

### `swift package update`

`swift package update` fetches the latest versions of your dependencies that still satisfy your constraints. It updates `Package.resolved` accordingly. Use it to pull in patch/minor updates:

```bash
swift package update                        # update all dependencies
swift package update SomePackage            # update a specific dependency
```

After updating, test before committing the new `Package.resolved`. A minor update in a transitive dependency can introduce behavioral changes.

## Local packages

During development — especially in a multi-module app — you can depend on a package at a local path instead of a remote URL:

```swift
// Package.swift
dependencies: [
    .package(path: "../MySharedLib")
]
```

The path is relative to the package root. The local package must have its own `Package.swift`. When you modify the local package, the dependent package picks up the changes on the next build — no commit or push required.

Local packages are ideal for:

- Sharing code between an iOS app and a watchOS app.
- Extracting a module from a monolith while still iterating on it.
- Prototyping a library you plan to open-source later.

When you're ready to share, replace `.package(path:)` with `.package(url:from:)` pointing to the remote repository.

## Binary targets

Binary targets distribute pre-compiled `.xcframework` bundles — useful for proprietary SDKs, closed-source libraries, or large pre-compiled dependencies:

```swift
// Package.swift
targets: [
    .binaryTarget(
        name: "AnalyticsSDK",
        url: "https://cdn.example.com/AnalyticsSDK-2.1.0.xcframework.zip",
        checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    )
]
```

Requirements:

- The ZIP must contain a single `.xcframework` (not multiple frameworks or static libs).
- The checksum must be a SHA-256 hash of the zip file.
- Binary targets are **not** open-sourced — consumers cannot inspect the source.

Generate the checksum:

```bash
swift package compute-checksum AnalyticsSDK-2.1.0.xcframework.zip
```

Binary targets are the SPM equivalent of CocoaPods' `vendored_frameworks` or Carthage's pre-built binaries.

## Resources

SPM bundles resources declared in a target's `resources` array:

| Method | Behaviour | Example use |
|---|---|---|
| `.process("Resources")` | Processes the directory: `.storyboard` → compiled, `.xcassets` → compiled, everything else → copied | Most resources: images, strings, data files |
| `.copy("file.xib")` | Copies the file exactly as-is, preserving its path | NIB files, configuration files that need exact paths |
| `.reference("Doc")` | Makes the directory available but does not bundle it | Documentation, large datasets not shipped in the app |

Resources are bundled into the target's module bundle, accessible via `Bundle.module`:

```swift
extension Image {
    static let logo = Image("logo", bundle: .module)
}

extension String {
    static let greeting = try! String(contentsOf: Bundle.module.url(forResource: "greeting", withExtension: "txt")!)
}
```

`Bundle.module` is synthesized by SPM for every target that includes resources. It points to the package's resource bundle, not the main app bundle.

## Complete example: a two-module library

```swift
// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "NetworkingKit",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "NetworkingKit", targets: ["NetworkingKit"]),
        .library(name: "NetworkingKitUI", targets: ["NetworkingKitUI"]),
        .executable(name: "netcheck", targets: ["NetCheckCLI"])
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-log", from: "1.5.0"),
        .package(url: "https://github.com/pointfreeco/swift-dependencies", from: "1.0.0"),
        .package(path: "../LocalUtils")
    ],
    targets: [
        .target(
            name: "NetworkingKit",
            dependencies: [
                .product(name: "Logging", package: "swift-log"),
                "LocalUtils"
            ],
            resources: [.process("Resources")]
        ),
        .target(
            name: "NetworkingKitUI",
            dependencies: ["NetworkingKit"],
            resources: [.process("Resources")]
        ),
        .executableTarget(
            name: "NetCheckCLI",
            dependencies: ["NetworkingKit"]
        ),
        .testTarget(
            name: "NetworkingKitTests",
            dependencies: ["NetworkingKit"],
            resources: [.copy("Fixtures")]
        ),
        .testTarget(
            name: "NetworkingKitUITests",
            dependencies: ["NetworkingKitUI"]
        )
    ]
)
```

This package produces three products:

- **NetworkingKit** (library) — the core networking module, with a dependency on `swift-log` and the local `LocalUtils` package.
- **NetworkingKitUI** (library) — SwiftUI components that depend on the core module. iOS-only resource bundle.
- **netcheck** (executable) — a CLI tool that uses `NetworkingKit`.

Two test targets: unit tests with fixture files and UI tests. Each target explicitly lists its dependencies and resources.

### Building and testing

```bash
# Build the library
swift build

# Run tests
swift test

# Run a specific test target
swift test --filter NetworkingKitTests

# Build the executable
swift build --product netcheck

# Run the executable
swift run netcheck

# Generate a resolved lockfile
swift package resolve

# Update dependencies
swift package update

# Show the dependency graph
swift package show-dependencies
```

## Comparison with Objective-C

| | SPM | CocoaPods | Carthage |
|---|---|---|---|
| Integration | Build system (`swift build`, Xcode) | Pre-build script phase | Pre-build script phase |
| Workspace file | Xcode project (not workspace) | `.xcworkspace` | No workspace |
| Dependency format | Swift source | Podspec (Ruby) | Framework binaries |
| Version resolution | Semantic versioning, local + remote | Semantic via `Podfile` | Git tags |
| Lockfile | `Package.resolved` | `Podfile.lock` | `Cartfile.resolved` |
| Binary support | `.binaryTarget` (xcframework) | `vendored_frameworks` | Pre-built binaries |
| Apple-first? | Yes — Apple's official tool | Third-party | Third-party |

CocoaPods and Carthage predate SPM but are now in maintenance mode for most iOS projects. Apple's docs, Xcode integration, and the broader ecosystem have converged on SPM. New libraries are distributed primarily via SPM; CocoaPods is mostly relevant for legacy projects or libraries that still require it.

## What's next

You can now create a multi-module package, declare dependencies with precise version constraints, add resources, and build/run/test with SPM commands. The next page covers iOS patterns in Swift — delegates, observation, and the design patterns you'll encounter working with Apple SDKs.

**Next** → [iOS patterns in Swift](./12-ios-patterns-in-swift.md)
