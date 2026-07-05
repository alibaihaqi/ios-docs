---
title: Sign in with Apple
tier: advanced
platform: ios
position: 3
---

# Sign in with Apple

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Advanced › Sign in with Apple

**Goal**

Add Sign in with Apple (SiWA) using `AuthenticationServices`. The app shows a sign-in button; after successful auth, the user's name and email are available.

**Prerequisites**

- [Add SwiftData](./02-add-swiftdata.md)
- An Apple Developer account (free or paid)
- An App ID with "Sign in with Apple" capability enabled

## Capability setup

In Xcode:

1. Select the project in the navigator
2. Target → Signing & Capabilities
3. Click **+ Capability** → **Sign in with Apple**

This adds the entitlement to your `.entitlements` file:

```xml
<key>com.apple.developer.applesignin</key>
<array>
    <string>Default</string>
</array>
```

## The sign-in button

Create `SignInView.swift`:

```swift
import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 24) {
            Text("Sign in to save your favorites")
                .font(.title2)

            SignInWithAppleButton(
                onRequest: { request in
                    request.requestedScopes = [.fullName, .email]
                },
                onCompletion: { result in
                    switch result {
                    case .success(let auth):
                        handleAuth(auth)
                    case .failure(let error):
                        print("SiWA failed: \(error)")
                    }
                }
            )
            .frame(height: 50)
            .padding(.horizontal, 40)
        }
        .padding()
    }

    private func handleAuth(_ auth: ASAuthorization) {
        guard let cred = auth.credential as? ASAuthorizationAppleIDCredential,
              let token = cred.identityToken
        else { return }

        let userID = cred.user
        let fullName = [cred.fullName?.givenName, cred.fullName?.familyName]
            .compactMap { $0 }
            .joined(separator: " ")

        // Store the identity token (JWT) in a token manager
        TokenManager.shared.storeAppleToken(
            userID: userID,
            name: fullName,
            token: token
        )
        dismiss()
    }
}
```

## Wire sign-in into ContentView

Present the sign-in sheet when the user tries to favorite without being signed in:

```swift
struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel: ItemViewModel?
    @State private var showSignIn = false

    var body: some View {
        // ... existing List ...
        .sheet(isPresented: $showSignIn) {
            SignInView()
        }
        .onAppear {
            if !TokenManager.shared.isSignedIn {
                showSignIn = true
            }
            viewModel = ItemViewModel(modelContext: modelContext)
        }
    }
}
```

## Checkpoint

Run in the simulator. The sign-in sheet appears on first launch. Tap the "Sign in with Apple" button — the system prompts for your iCloud account (configured in Settings). After signing in, the sheet dismisses and the app works normally.

**Next:** [Secure token storage](./04-secure-token-storage.md) — store Apple identity tokens in the Keychain.
