---
title: UIKit with ObjC
tier: objective-c
platform: ios
---

# UIKit with ObjC

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › UIKit with ObjC

**Goal**

You will implement a `UIViewController` in Objective-C — wiring up the view lifecycle, target-action, `IBOutlet`/`IBAction`, and programmatic Auto Layout — and understand the app-level lifecycle through `UIApplicationDelegate`. After this page you can read and write a screen of UIKit code in ObjC, which is what every pre-SwiftUI iOS app was built from.

**Prerequisites**

- [07 Blocks](./07-blocks.md)

## UIKit is Objective-C

This is the most important fact about UIKit: it is written in Objective-C. `UIView`, `UIViewController`, `UILabel`, `UIButton`, `UIScreen`, `UIApplication` — all `NSObject` subclasses, all reference-counted, all exposing their API through `@interface` headers. This is why Swift can call UIKit transparently: the Swift compiler bridges to the same ObjC runtime, and SwiftUI is itself a Swift framework layered *on top of* UIKit underneath (`UIScene`-based hosting).

Consequences for reading UIKit code:

- Every method you call is an ObjC message send, dispatched dynamically.
- Properties follow the `@property` / `nonatomic` / `strong` / `weak` rules from page 03.
- Memory follows the ARC rules from page 04 — `weak` outlets, the weak/strong dance in callbacks.
- Target-action and delegation (page 05) are the two dominant interaction patterns.

## View controller lifecycle

`UIViewController` is the unit of screen management in UIKit. The runtime calls a sequence of methods as the controller's view appears and disappears. Override the ones you need; always call `super` first.

```objc
- (void)loadView;                        // Create the root view. Override only for fully programmatic root views.
- (void)viewDidLoad;                     // View is loaded into memory. One-time setup. Called once.
- (void)viewWillAppear:(BOOL)animated;   // View is about to be added to the hierarchy. Per-appear setup.
- (void)viewDidAppear:(BOOL)animated;    // View is now on screen. Start animations, timers, observers.
- (void)viewWillDisappear:(BOOL)animated;// View is about to leave. Stop timers, save state, resign first responder.
- (void)viewDidDisappear:(BOOL)animated; // View is off screen. Stop observers, free heavy resources.
- (void)viewWillLayoutSubviews;          // View is about to lay out subviews. Geometry may change.
- (void)viewDidLayoutSubviews;           // Subviews have been positioned. Read final frames here.
```

What to do in each:

| Method | Do | Don't |
|---|---|---|
| `loadView` | Assign a programmatically created root view to `self.view`. | Don't call `super` if you replace the view entirely; don't touch `self.view` before it's set (infinite recursion). |
| `viewDidLoad` | Add subviews, set up constraints, configure one-time state. | Don't do geometry-dependent work — frames are not final yet. |
| `viewWillAppear:` | Refresh data, update nav bar, start network fetches. | Don't do heavy one-time setup (use `viewDidLoad`). |
| `viewDidAppear:` | Start animations, notifications, timers; track screen views. | Don't push another view controller here (causes nav glitches). |
| `viewWillDisappear:` | Stop timers, resign first responder, persist drafts. | Don't tear down views you'll need on reappearance. |
| `viewDidLayoutSubviews` | Read final `view.bounds`, adjust manual layouts. | Don't trigger another layout pass (`setNeedsLayout`) here — recursion. |

`viewDidLoad` fires exactly once per controller instance. `viewWillAppear:`/`viewDidAppear:` fire every time the view comes on screen (including after a `pop` returns to it). This distinction — *load once* vs *appear repeatedly* — is the source of most lifecycle bugs.

## A minimal programmatic view controller

A `UIViewController` that creates a `UILabel` in `viewDidLoad` and centers it with Auto Layout:

```objc
// HelloViewController.m
#import "HelloViewController.h"

@implementation HelloViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    self.view.backgroundColor = [UIColor systemBackgroundColor];

    UILabel *label = [[UILabel alloc] init];
    label.text = @"Hello from Objective-C";
    label.translatesAutoresizingMaskIntoConstraints = NO;   // Auto Layout owns the frame
    [self.view addSubview:label];

    [NSLayoutConstraint activateConstraints:@[
        [label.centerXAnchor constraintEqualToAnchor:self.view.centerXAnchor],
        [label.centerYAnchor constraintEqualToAnchor:self.view.centerYAnchor]
    ]];
}

@end
```

Key things:

- `self.view` is lazily created the first time it's accessed — touching it in `viewDidLoad` triggers `loadView` if it hasn't run yet, which is why you call `[super viewDidLoad]` first.
- `translatesAutoresizingMaskIntoConstraints = NO` is mandatory for views you position with Auto Layout. Without it, UIKit auto-generates constraints from the view's frame and `autoresizingMask`, which fight your explicit constraints.
- `[NSLayoutConstraint activateConstraints:@[...]]` is the modern batch API — equivalent to adding each constraint but more efficient. The anchor API (`centerXAnchor`, etc.) is the readable form; the older `+constraintWithItem:attribute:relatedBy:toItem:attribute:multiplier:constant:` form still appears in older code.

## Target-action

UIKit's primary event-dispatch mechanism is **target-action**: a control (button, switch, slider) holds a target object and a selector; when the control's event fires, it sends the selector to the target.

```objc
- (void)setupButton {
    UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
    button.translatesAutoresizingMaskIntoConstraints = NO;
    [button setTitle:@"Tap me" forState:UIControlStateNormal];
    [button addTarget:self
               action:@selector(buttonTapped:)
     forControlEvents:UIControlEventTouchUpInside];
    [self.view addSubview:button];
    // ... constraints ...
}

- (void)buttonTapped:(UIButton *)sender {
    // sender is the control that fired the event
    NSLog(@"button titled '%@' was tapped", [sender currentTitle]);
}
```

- `@selector(buttonTapped:)` is the compiler expression that produces a `SEL` — the runtime token for a method name. The trailing colon is part of the selector name and must match the method signature exactly (`buttonTapped:` takes one argument).
- `UIControlEventTouchUpInside` is the standard "tap" event for buttons.
- The action method's signature can be `- (void)action`, `- (void)action:(id)sender`, or `- (void)action:(id)sender forEvent:(UIEvent *)event`. The control introspects the method and calls the matching form.

Target-action is dynamic dispatch — the runtime looks up the selector on the target at fire time. If the target doesn't implement it, nothing happens (no crash, unlike a missing required protocol method).

## IBOutlet and IBAction

Interface Builder (Storyboards and `.xib` files) lets you design views visually and connect them to code. The connection markers are `IBOutlet` and `IBAction`, which are compile-time hints (they expand to nothing / `void`) that Interface Builder scans for:

```objc
// MyViewController.h
#import <UIKit/UIKit.h>

@interface MyViewController : UIViewController

// Outlet: a property connected to a view in the Storyboard.
@property (nonatomic, weak) IBOutlet UILabel *titleLabel;
@property (nonatomic, weak) IBOutlet UIButton *actionButton;

// Action: a method connected to a control event in the Storyboard.
- (IBAction)actionButtonTapped:(UIButton *)sender;

@end
```

- `IBOutlet` marks a property as connectable to a view object in the nib. The keyword is a no-op to the compiler — it only tells Interface Builder "this property can be wired up."
- `IBAction` marks a method as connectable to a control event. It expands to `void`, so the method is an ordinary instance method to the compiler; Interface Builder just uses the marker to list it in the connection picker.
- Outlets are conventionally `weak` because the view hierarchy already holds the view strongly (`self.view.subviews` retains it). A `weak` outlet avoids a cycle and auto-nils if the view is removed. The exception is a top-level outlet (a view not held by any parent, like a root view or a prototype cell's container) — those must be `strong`.

The connections are loaded from the nib in `initWithCoder:` (called by the Storyboard instantiation path) and ready by `viewDidLoad`. Touching an outlet before `viewDidLoad` gives `nil`.

## AppDelegate — the app lifecycle

`UIApplicationDelegate` is the protocol your app's delegate adopts to receive app-level events. The modern entry points (post-scene/SwiftUI era) live in scenes, but the classic ones still apply:

```objc
// AppDelegate.m
#import "AppDelegate.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // One-time app setup: window, root VC, appearance, logging.
    return YES;
}

- (void)applicationWillResignActive:(UIApplication *)application {
    // App is about to lose focus (incoming call, control center).
}

- (void)applicationDidEnterBackground:(UIApplication *)application {
    // App is now in the background. Save state, stop timers, release resources.
}

- (void)applicationWillEnterForeground:(UIApplication *)application {
    // App is about to come back. Undo background teardown.
}

- (void)applicationDidBecomeActive:(UIApplication *)application {
    // App is now foreground and active. Restart what you paused.
}

- (void)applicationWillTerminate:(UIApplication *)application {
    // App is being killed. ~5s to do final cleanup. Not always called
    // (the OS may suspend-then-kill without this), so don't rely on it
    // for state saving — do that in applicationDidEnterBackground:.
}

@end
```

State transitions:

```
Not running ──didFinishLaunching──▶ Active ──resignActive──▶ Inactive ──enterBackground──▶ Background
                                       ▲                                                    │
                                       └─────────enterForeground◀── Inactive ◀─────────────┘
```

The reliable checkpoint is `applicationDidEnterBackground:` — that is where you save user state and release heavy resources, because the app may be killed at any time after entering background. `applicationWillTerminate:` is best-effort and frequently not called.

## Nib, Storyboard, or programmatic?

Three ways to build a screen:

| Approach | What it is | When |
|---|---|---|
| **Programmatic** | Create views and constraints in code (as in the `HelloViewController` above). | When you want full control, version-friendly diffs, reusable components, or no visual editor. The modern default for non-trivial UIs. |
| **Nib (`.xib`)** | A single Interface Builder file describing one view (or one view controller's view tree). Loaded at runtime via `UINib`/`loadNibNamed:`. | Self-contained views, table-view cells, reusable panel components. |
| **Storyboard** | A multi-scene IB file with segues between view controllers. Visualizes navigation flow. | Small apps with linear navigation. Gets unwieldy for teams (merge conflicts) and complex flows. |

All three produce the same runtime objects — they differ only in *where the view tree is described*. A `UIView` created in a Storyboard and one created in code are indistinguishable at runtime; the Storyboard just deserializes the same `alloc`/`init`/property-set sequence you'd write by hand.

## Why this still matters

You will read Objective-C UIKit constantly even in a Swift-first world:

- Every Apple sample from before ~2019 is ObjC UIKit.
- Framework headers (`UIKit/UIViewController.h`, `UIKit/UIView.h`) are ObjC, and Swift's UIKit API is generated from them.
- Legacy codebases, especially in larger companies, are mostly ObjC UIKit.
- Understanding the lifecycle, target-action, and outlet model makes you a better SwiftUI developer — SwiftUI's `.onAppear`, `.onDisappear`, and view identity are abstractions over these same runtime events.

## What's next

You can now build a screen. The next page covers how ObjC signals failure without exceptions — `NSError` out-parameters, the `NSError **` convention, and error recovery.

**Next** → [Error handling](./09-error-handling.md)
