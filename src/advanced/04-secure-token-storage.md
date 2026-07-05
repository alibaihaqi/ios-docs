---
title: Secure token storage
tier: advanced
platform: ios
position: 4
---

# Secure token storage

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Advanced › Secure token storage

**Goal**

Build a Keychain wrapper to store Apple identity tokens securely, and an `@Observable` token manager that surfaces auth state to the view layer.

**Prerequisites**

- [Sign in with Apple](./03-sign-in-with-apple.md)

## Why Keychain

`UserDefaults` is insecure for tokens — they're stored in plaintext in the app's preferences plist. The iOS Keychain is encrypted at rest, accessible only by your app, and automatically protected by the device passcode.

## Keychain wrapper

Create `KeychainService.swift`:

```swift
import Foundation
import Security

enum KeychainService {
    static func store(key: String, data: Data) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func read(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
        ]
        var result: CFTypeRef?
        SecItemCopyMatching(query as CFDictionary, &result)
        return result as? Data
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
```

## Token manager

Create `TokenManager.swift`:

```swift
import Foundation
import Observation

@Observable
final class TokenManager {
    static let shared = TokenManager()

    private(set) var isSignedIn = false
    private(set) var userName: String = ""
    private(set) var userID: String = ""

    private init() {
        loadFromKeychain()
    }

    func storeAppleToken(userID: String, name: String, token: Data) {
        self.userID = userID
        self.userName = name
        self.isSignedIn = true

        let dict = ["userID": userID, "name": name]
        if let data = try? JSONSerialization.data(withJSONObject: dict) {
            KeychainService.store(key: "apple_user", data: data)
        }
        KeychainService.store(key: "apple_token", data: token)
    }

    func signOut() {
        KeychainService.delete(key: "apple_user")
        KeychainService.delete(key: "apple_token")
        isSignedIn = false
        userName = ""
        userID = ""
    }

    private func loadFromKeychain() {
        guard let data = KeychainService.read(key: "apple_user"),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: String],
              let uid = dict["userID"]
        else { return }
        userID = uid
        userName = dict["name"] ?? ""
        isSignedIn = true
    }
}
```

## Use across the app

Now any view can observe auth state reactively:

```swift
struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel: ItemViewModel?
    @State private var showSignIn = false

    var body: some View {
        VStack {
            if TokenManager.shared.isSignedIn {
                HStack {
                    Text("Hi, \(TokenManager.shared.userName)")
                        .font(.caption)
                    Button("Sign Out") { TokenManager.shared.signOut() }
                        .font(.caption)
                }
            }
            // ... list ...
        }
        .sheet(isPresented: $showSignIn) {
            SignInView()
        }
        .onAppear {
            if !TokenManager.shared.isSignedIn { showSignIn = true }
            viewModel = ItemViewModel(modelContext: modelContext)
        }
    }
}
```

## Checkpoint

Run the app. Sign in with Apple — close and reopen the app. The user stays signed in (no sign-in prompt). Tap "Sign Out" — the token is deleted from the Keychain, and the sign-in sheet reappears.

**Next:** [Unit tests](./05-unit-tests.md) — XCTest for ViewModel + Model layers.
