---
title: Push notifications
tier: advanced
platform: ios
position: 8
---

# Push notifications

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Advanced › Push notifications

**Goal**

Register the app for remote push notifications via Apple Push Notification service (APNs), handle incoming payloads, and display them as banners or in-app alerts.

**Prerequisites**

- [CI/CD with GitHub Actions](./07-ci-cd-github-actions.md)
- An Apple Developer account with push notification certificate or key
- A physical iOS device (push notifications don't work on simulator)

## Capability setup

In Xcode:

1. Target → Signing & Capabilities
2. Add capability: **Push Notifications**

This adds the required entitlement:

```xml
<key>aps-environment</key>
<string>development</string>
```

## Register for notifications

Add notification registration to `ListApp.swift`:

```swift
import SwiftUI
import SwiftData
import UserNotifications

@main
struct ListApp: App {
    @State private var notificationGranted = false

    var body: some Scene {
        WindowGroup {
            ContentView()
                .task {
                    await requestNotificationPermission()
                }
        }
        .modelContainer(for: [CachedItem.self])
    }

    private func requestNotificationPermission() async {
        let center = UNUserNotificationCenter.current()
        do {
            let granted = try await center.requestAuthorization(
                options: [.alert, .badge, .sound]
            )
            notificationGranted = granted
            if granted {
                await UIApplication.shared.registerForRemoteNotifications()
            }
        } catch {
            print("Notification permission error: \(error)")
        }
    }
}
```

## Handle registration

Add an `AppDelegate` to receive APNs callbacks:

```swift
import UIKit

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        print("APNs device token: \(token)")
        // Send token to your server for push targeting
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("APNs registration failed: \(error)")
    }
}
```

Wire the `AppDelegate` in `ListApp.swift`:

```swift
@main
struct ListApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    // ...
}
```

## Handle incoming notifications

Add a notification response handler via `UNUserNotificationCenterDelegate`:

```swift
extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show banner even when app is in foreground
        completionHandler([.banner, .sound])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        // handleDeepLink(userInfo)
        completionHandler()
    }
}
```

Set the delegate in `requestNotificationPermission`:

```swift
center.delegate = appDelegate
```

## Sending a test push

Use `curl` to send a test push through APNs (requires a p8 key from your Apple Developer account):

```bash
# You'll need:
# - APNs key (.p8) from developer.apple.com
# - Key ID and team ID
# - Device token from the app's console output
TOKEN="<device-token>"
curl --http2 -v \
  -H "apns-topic: com.yourcompany.ListApp" \
  -H "apns-push-type: alert" \
  --cert-type P12 \
  -d '{"aps":{"alert":"Hello from APNs!","sound":"default"}}' \
  "https://api.development.push.apple.com/3/device/$TOKEN"
```

## Checkpoint

Run the app on a physical device. Grant notification permission. The console prints the device token. Sending a push via `curl` shows a banner notification on the device, both in foreground and background.

**Next:** [Instruments profiling](./09-instruments-profiling.md) — find performance bottlenecks with Instruments.
