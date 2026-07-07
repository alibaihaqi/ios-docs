---
title: KVO and NotificationCenter
tier: objective-c
platform: ios
---

# KVO and NotificationCenter

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › KVO and NotificationCenter

**Goal**

You will use Objective-C's two built-in observation mechanisms — **Key-Value Observing** (KVO) for reacting to a property change on a specific object, and **NSNotificationCenter** for broadcast-style messaging between unrelated objects. You will learn registration, the `context` pointer discipline, removal in `dealloc`, the block-based notification API, and when each pattern (vs delegation) is the right tool. After this page you can wire reactive-style connections in ObjC and understand what Swift's `Combine` replaced.

**Prerequisites**

- [09 Error handling](./09-error-handling.md)

## Key-Value Observing (KVO)

### What it is

KVO lets object A observe a property of object B and be notified whenever that property's value changes. It is Objective-C's reactivity primitive — the closest thing the language has to a `@State`/`@Published` binding. It works through the runtime: when you observe a key path, the runtime dynamically subclasses the observed object and overrides the setter to fire change notifications.

```objc
[user addObserver:self forKeyPath:@"name" options:NSKeyValueObservingOptionNew context:&KVONameContext];
```

When `user.name` is later reassigned, your observer's callback fires.

### Registering and the callback

Registration takes the observed object, the observer, a key path string, a bitmask of what to capture (new value, old value, initial, prior), and a `context` pointer:

```objc
// One-time setup — store a unique address as the context.
static void *KVONameContext = &KVONameContext;

- (void)observeUser:(User *)user {
    [user addObserver:self
           forKeyPath:@"name"
              options:(NSKeyValueObservingOptionNew | NSKeyValueObservingOptionOld)
              context:&KVONameContext];
}
```

The callback is a single method on the observer. **Every** KVO notification routes through it, so you must dispatch by key path and (critically) by context:

```objc
- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary<NSKeyValueChangeKey,id> *)change
                       context:(void *)context {
    if (context == &KVONameContext) {
        NSString *oldName = change[NSKeyValueChangeOldKey];
        NSString *newName = change[NSKeyValueChangeNewKey];
        NSLog(@"name: %@ -> %@", oldName, newName);
    } else {
        // Not ours — forward to super so a subclass's observation still works.
        [super observeValueForKeyPath:keyPath ofObject:object change:change context:context];
    }
}
```

The `change` dictionary holds the values you asked for via `options`:

| Option key | Meaning |
|---|---|
| `NSKeyValueChangeNewKey` | The new value (requires `NSKeyValueObservingOptionNew`). |
| `NSKeyValueChangeOldKey` | The old value (requires `NSKeyValueObservingOptionOld`). |
| `NSKeyValueChangeKindKey` | What kind of change — setting, insertion, removal (for to-many collections). |
| `NSKeyValueChangeIndexesKey` |Affected indexes for ordered to-many collection mutations. |
| `NSKeyValueChangeNotificationIsPriorKey` | `@YES` if this is the pre-change notification (requires `NSKeyValueObservingOptionPrior`). |

Options bitmask:

- `NSKeyValueObservingOptionNew` — include the new value in `change`.
- `NSKeyValueObservingOptionOld` — include the old value.
- `NSKeyValueObservingOptionInitial` — fire once immediately with the current value, before any change.
- `NSKeyValueObservingOptionPrior` — fire twice: once before the change, once after.

### The context pointer — why it matters

The `context` is the single most misunderstood part of KVO. It is a `void *` you provide at registration and receive back unchanged in the callback. The idiomatic use is a **file-static variable whose address is unique to that observation**:

```objc
static void *KVONameContext = &KVONameContext;
```

Why not pass `nil`? Because if a subclass of your observer also registers for the same key path (or your superclass does), and you both use `nil`, you cannot tell whose notification fired. Your callback runs for *every* KVO observation that targets `self`, and the only safe way to claim one is to compare the `context` address against your own static. The Apple guidance is explicit: never use `nil`, never use a key-path string comparison as the primary check (key paths collide too).

### Automatic vs manual KVO

By default, the runtime fires KVO automatically whenever a property's conforming setter is called. You can opt a specific property out by overriding `+automaticallyNotifiesObserversForKey:`:

```objc
+ (BOOL)automaticallyNotifiesObserversForKey:(NSString *)key {
    if ([key isEqualToString:@"name"]) {
        return NO;   // we'll send manual notifications
    }
    return [super automaticallyNotifiesObserversForKey:key];
}
```

Manual notification is for when you change the backing ivar directly (bypassing the setter) or want to batch dependent changes:

```objc
- (void)setName:(NSString *)name {
    [self willChangeValueForKey:@"name"];
    _name = [name copy];
    [self didChangeValueForKey:@"name"];
}
```

You can also declare dependent keys — e.g. "fullName depends on firstName and lastName" — with `+keyPathsForValuesAffectingValueForKey:` or `+keyPathsForValuesAffecting<Key>`, so observing `fullName` fires when either name changes.

### You MUST remove the observer

Every registration must be balanced by a removal, or you crash. The classic crash: observer deallocs while still registered on the observed object, the observed property later changes, the runtime messages a freed observer → `EXC_BAD_ACCESS` or an "an instance was deallocated while key value observers were still registered" exception.

Remove in `dealloc`:

```objc
- (void)dealloc {
    [_user removeObserver:self forKeyPath:@"name" context:&KVONameContext];
}
```

Prefer the `context:`-bearing overload (`removeObserver:forKeyPath:context:`, available since 10.7 / iOS 5) — it disambiguates when you registered multiple times for the same key path with different contexts. Always store the observed object in a `strong` or `weak` property (see pitfalls below) so you have a reference to remove from.

### Pitfalls

- **Observing `self` for your own property** causes a retain cycle if you hold yourself — actually it does not, but registering `self` as an observer of `self` is pointless (you already know your setter ran) and easy to get wrong. More importantly, never observe a property *on* `self` if the observation's `context` handling is also on `self` — use a direct setter instead.
- **Repeated registration = multiple callbacks.** Calling `addObserver:forKeyPath:` twice for the same pair fires the callback twice per change. There is no deduplication.
- **Forgetting removal** = crash on next change after the observer deallocs.
- **Observing a property that doesn't exist** or isn't KVO-compliant = silent or `NSUndefinedKeyException`. Custom ivars changed outside a setter need manual `will/didChangeValueForKey:`.
- **Block-based KVO** (iOS 5+ / 10.7+) returns an `id<NSObject>` token you must store and `-invalidate` — same lifecycle, less boilerplate. See the NotificationCenter block API below for the analogous pattern.

## NSNotificationCenter

Where KVO is one-to-one (one observer, one observed object, one key path), `NSNotificationCenter` is **one-to-many and decoupled**: a poster broadcasts a named notification, any number of observers receive it, and the two sides need not know each other. It is ObjC's pub/sub.

### Posting

```objc
[[NSNotificationCenter defaultCenter]
    postNotificationName:@"UserDidLogInNotification"
                  object:user
                userInfo:@{@"token": token}];
```

- `name` — a string (conventionally suffixed `Notification`, or use `NSNotificationName`).
- `object` — the poster, or the object the notification concerns. Observers can filter on this. Pass `nil` to mean "any object".
- `userInfo` — optional dictionary payload.

There is also a convenience `+notificationWithName:object:userInfo:` to build first, and `postNotification:` to post a pre-built one.

### Observing — selector API

```objc
[[NSNotificationCenter defaultCenter]
    addObserver:self
       selector:@selector(userDidLogIn:)
           name:@"UserDidLogInNotification"
         object:nil];   // nil = any poster
```

The selector takes exactly one `NSNotification *` argument:

```objc
- (void)userDidLogIn:(NSNotification *)note {
    User *user = note.object;
    NSString *token = note.userInfo[@"token"];
}
```

### Observing — block API (iOS 4+ / 10.6+)

The modern form takes a block and returns an opaque token. Store the token; remove it later:

```objc
@property (nonatomic, strong) id<NSObject> loginObserver;

- (void)startObserving {
    __weak typeof(self) weakSelf = self;
    self.loginObserver = [[NSNotificationCenter defaultCenter]
        addObserverForName:@"UserDidLogInNotification"
                    object:nil
                     queue:[NSOperationQueue mainQueue]
                usingBlock:^(NSNotification *note) {
            __strong typeof(weakSelf) strongSelf = weakSelf;
            if (!strongSelf) return;
            [strongSelf handleLogin:note];
        }];
}
```

Note the weak/strong dance from page 07: the block captures `self` (through `weakSelf`), and the notification center retains the block for the lifetime of the registration. If you captured `self` strongly and the center retained the block, you'd have a cycle (self → loginObserver property → block → self). Capture weak, re-strengthen inside.

### Removing observers

- **Selector-based:** `[center removeObserver:self];` (blunt — removes everything) or the precise `[center removeObserver:self name:@"UserDidLogInNotification" object:nil];`. Do this in `dealloc`.
- **Block-based:** you cannot use `removeObserver:self` — the observer is the token, not `self`. Call `[center removeObserver:self.loginObserver];`, or (modern) `[self.loginObserver invalidate];` if the token conforms. Hold the token in a strong property so it survives until `dealloc`.

Since iOS 9 / 10.11, `NSNotificationCenter` automatically deregisters selector-based observers whose `object` deallocs, *but not block-based ones whose token you leaked* — always store and remove the token explicitly.

### When to use what

| Mechanism | Relationship | Coupling | Best for |
|---|---|---|---|
| **Delegation** | 1-to-1, long-lived | Strong (protocol) | The delegate is a single, known collaborator — a view controller answering for its data source. |
| **KVO** | 1-to-1, property-level | Loose (key path) | Reacting to a specific mutable value — model state driving a label. |
| **NotificationCenter** | 1-to-many, decoupled | Loosest (string name) | Broadcasts where the poster shouldn't know the listeners — login, orientation change, app backgrounding. |
| **Blocks / completion** | 1-to-1, one-shot | Inline | A single async result — a network call's callback. |

Rules of thumb: if the relationship is "one object tells one collaborator about a stream of events", use a delegate. If it's "I want to know whenever this value changes", use KVO. If it's "something happened and anyone who cares should find out", use NotificationCenter.

## A complete KVO example

Putting it together — a controller that watches a `User` object's `name` and logs every change, with correct context, removal, and lifecycle:

```objc
// User.h
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN
@interface User : NSObject
@property (nonatomic, copy) NSString *name;
@end
NS_ASSUME_NONNULL_END
```

```objc
// UserViewController.m
#import "UserViewController.h"
#import "User.h"

static void *UserNameContext = &UserNameContext;

@interface UserViewController ()
@property (nonatomic, strong) User *user;
@end

@implementation UserViewController

- (instancetype)initWithUser:(User *)user {
    self = [super init];
    if (self) {
        _user = user;
        [user addObserver:self
               forKeyPath:@"name"
                  options:(NSKeyValueObservingOptionNew | NSKeyValueObservingOptionOld)
                  context:&UserNameContext];
    }
    return self;
}

- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary<NSKeyValueChangeKey,id> *)change
                       context:(void *)context {
    if (context == &UserNameContext) {
        NSLog(@"name changed: %@ -> %@",
              change[NSKeyValueChangeOldKey],
              change[NSKeyValueChangeNewKey]);
    } else {
        [super observeValueForKeyPath:keyPath ofObject:object change:change context:context];
    }
}

- (void)dealloc {
    [_user removeObserver:self forKeyPath:@"name" context:&UserNameContext];
}

@end
```

The lifecycle to verify: register once at construction, dispatch by context in the callback, forward unknown contexts to `super`, remove once in `dealloc`. Miss any of those four and you have a bug.

## Comparing with Swift

| Objective-C | Swift |
|---|---|
| `[obj addObserver:fo forKeyPath:@"name" options:… context:&ctx]` | `obj.observe(\.name, options:…) { _, change in … }` (block-based KVO, `NSKeyValueObservedToken`) |
| `observeValueForKeyPath:ofObject:change:context:` override | Closure passed to `observe(_:options:changeHandler:)` |
| `static void *Ctx = &Ctx;` context discipline | No context needed — each `observe` call returns its own token |
| `[[NSNotificationCenter defaultCenter] addObserver:…]` | `NotificationCenter.default.addObserver(forName:object:queue:using:)` |
| Selector `@selector(handle:)` | `#selector(handle(_:))` or a trailing closure |
| KVO + NotificationCenter as the only reactive primitives | `Combine` publishers (`objectWillChange`, `@Published`) and Swift `Observation` (iOS 17+) replace both for most use cases |

Swift did not remove KVO or NotificationCenter — both still exist, because Foundation is still ObjC underneath. But Swift code rarely reaches for them: `Combine`'s `@Published` and the macro-based `Observation` framework give compile-time-checked reactivity without the `context` discipline or the dealloc-removal trap. You will still read KVO in legacy code and when observing `AVPlayer` / `NSProgress` / similar Foundation types that expose KVO-only state.

## What's next

You can now wire reactive and broadcast connections in ObjC. The next page covers the bridge between the two languages — **ObjC-Swift interop**: the bridging header, `@objc` / `@objcMembers`, nullability annotations, `NS_SWIFT_NAME`, and a complete mixed-source example where an ObjC `DataManager` is consumed by a Swift view controller.

**Next** → [ObjC-Swift interop](./11-objc-swift-interop.md)
