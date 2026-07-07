---
title: Memory management
tier: objective-c
platform: ios
---

# Memory management

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › Memory management

**Goal**

You will understand the reference-counting model that Objective-C objects follow, how ARC automates it at compile time, when to use `strong` / `weak` / `copy` / `assign`, how to break retain cycles, and how to bridge across the CoreFoundation boundary. After this page you can read ObjC memory code and not be surprised.

**Prerequisites**

- [03 Classes and objects](./03-classes-and-objects.md)

## The retain count model

Every Objective-C object (any instance of a class descending from `NSObject`) has a **retain count** — an integer tracking how many owners it has.

- `retain` increments the count. You are saying "I want to be an owner."
- `release` decrements the count. You are saying "I'm done."
- `autorelease` schedules a `release` for later (at the end of the current autorelease pool).
- When the count hits `0`, the runtime calls `-dealloc` and frees the object's memory.

You do **not** call these under ARC. But you must understand them, because ARC generates exactly these calls and the semantics are unchanged.

```
alloc] init]        →  count = 1   (you own it)
retain              →  count = 2   (second owner)
release             →  count = 1
release             →  count = 0   →  -dealloc called
```

The golden rule, from the pre-ARC era and still true conceptually:

> If you obtained an object via `alloc`, `new`, `copy`, `mutableCopy`, or `retain`, you own it and must balance that with a `release` or `autorelease`. If you obtained it any other way (a factory method, a getter), you do **not** own it; it's autoreleased and valid within the current scope.

ARC enforces this rule for you. The compiler inserts the retains and releases.

## Manual retain/release (MRC) — brief history

Before Xcode 4.4 (2011), Objective-C required manual retain/release. Every `alloc` had to be balanced. Every property assignment to a `strong` reference had to retain the new value and release the old one. Getting it wrong was the #1 source of crashes:

- **Over-release** — calling `release` one too many times → count goes negative → crash (`EXC_BAD_ACCESS`) when the runtime tries to dealloc an already-freed object.
- **Leak** — forgetting to `release` → count never hits zero → memory grows.

You will still see this style in legacy code and in Apple framework internals. Here's what it looked like:

```objc
// MRC (pre-ARC) — do not write this today
- (void)setName:(NSString *)name {
    if (_name != name) {
        [_name release];          // release old
        _name = [name retain];    // retain new
    }
}

- (void)dealloc {
    [_name release];
    [super dealloc];   // MRC must call super
}
```

Modern code does not write this. ARC generates equivalent code automatically. But recognizing the pattern is essential for reading pre-2011 codebases and Apple's own framework source dumps.

## autorelease and autorelease pools

`autorelease` marks an object for later release — at the end of the current **autorelease pool**. It's how factory methods return objects you don't own:

```objc
+ (Person *)personWithName:(NSString *)name {
    Person *p = [[Person alloc] initWithName:name];   // count = 1, we own it
    return [p autorelease];                           // count still 1, but will drop to 0 at pool drain
}
```

The caller receives an object with count 1 that's pending release. It's valid for the rest of the current autorelease pool's lifetime. If they want to keep it longer, they `retain` it.

The modern syntax for a pool is the `@autoreleasepool` block:

```objc
@autoreleasepool {
    // objects autoreleased inside this block are released at the closing brace
    for (int i = 0; i < 1000000; i++) {
        NSString *s = [NSString stringWithFormat:@"item-%d", i];  // autoreleased
        // process s
    }   // each iteration's autoreleased string is released here, not accumulated
}
```

Every thread has an autorelease pool. The main thread's pool is drained at the end of each run loop iteration. `main` always wraps its body in `@autoreleasepool`.

Use `@autoreleasepool` in tight loops that create many temporary objects — without it, all the autoreleased strings accumulate until the run loop drains, spiking memory.

## ARC — Automatic Reference Counting

ARC is a **compile-time** feature, not a garbage collector. The compiler analyzes your code and inserts `retain` / `release` / `autorelease` calls for you. At runtime the behavior is identical to well-written MRC.

| | ARC | Garbage collection (e.g. Java) |
|---|---|---|
| When | Compile time | Runtime, periodic sweeps |
| Cost | Zero runtime overhead beyond MRC | Pause times, tracing |
| Determinism | Object freed when last strong ref goes away | Non-deterministic |
| Cycles | Leaks (you must break them) | Collector reclaims cycles |

ARC was introduced in 2011 and is mandatory for new Objective-C code. There is no flag to turn it off in modern Xcode for app targets.

Under ARC you **cannot** call `retain`, `release`, `autorelease`, or `[super dealloc]` directly — the compiler errors out. You instead declare your intent with property attributes and `__strong` / `__weak` / `__autoreleasing` / `__unsafe_unretained` variable qualifiers, and ARC inserts the calls.

```objc
// ARC handles everything
- (void)demo {
    Person *p = [[Person alloc] initWithName:@"Mei" age:30];  // strong by default
    // ... use p ...
}   // p goes out of scope → ARC inserts release → count 0 → dealloc
```

## strong / weak / copy / assign under ARC

These are the property attributes (also available as `__strong`, `__weak`, `__autoreleasing`, `__unsafe_unretained` variable qualifiers).

| Attribute | Semantics | When to use |
|---|---|---|
| `strong` | Retains the value; releases the old value on reassign. Object stays alive while this reference exists. (Default for object properties.) | Owning references — model objects, subviews you create, collections. |
| `weak` | Does not retain; auto-set to `nil` when the object deallocates. | Delegates, observers, back-references in a parent-child graph, IB outlets held by a superview. |
| `copy` | Sends `copy` to the new value (must implement `NSCopying`); retains the copy. Old value released. | `NSString`, `NSArray`, `NSDictionary`, `NSSet` — anything with a mutable subclass a caller could mutate. |
| `assign` | Plain assignment. No retain, no nil-ing. | Primitives (`NSInteger`, `CGFloat`, `BOOL`). For objects, prefer `weak` — `assign` leaves a dangling pointer. |
| `unsafe_unretained` | Same as `assign` for objects; the explicit "I know what I'm doing" form. Not nil-ed at dealloc. | Rare. Bridging to C APIs that hold a raw pointer. |

```objc
@property (nonatomic, strong) NSMutableArray<Person *> *people;   // owns the array
@property (nonatomic, weak) id <PersonDelegate> delegate;         // doesn't own delegate
@property (nonatomic, copy) NSString *title;                      // defensively copies
@property (nonatomic, assign) NSInteger generationCount;          // primitive
```

## Retain cycles and the weak/strong dance

A **retain cycle** happens when two objects hold strong references to each other (or an object holds a strong reference to itself through a closure). Neither can ever reach count 0, so both leak.

```objc
// Parent holds child strongly; child holds parent strongly → leak
@interface Parent : NSObject
@property (nonatomic, strong) Child *child;
@end

@interface Child : NSObject
@property (nonatomic, strong) Parent *parent;   // BUG: cycle
@end
```

Fix: one side owns, the other uses `weak`:

```objc
@property (nonatomic, weak) Parent *parent;   // child does not keep parent alive
```

The same pattern applies to delegates (`weak` by convention) and to block capture (covered on [page 07](./07-blocks.md)).

### The weak/strong dance inside blocks

If a block captures `self` strongly and `self` holds the block strongly, that's a cycle. The fix: capture `self` weakly, then re-strong it inside the block so it can't dealloc mid-block.

```objc
__weak typeof(self) weakSelf = self;
self.onComplete = ^{
    __strong typeof(weakSelf) strongSelf = weakSelf;
    if (!strongSelf) return;          // self already deallocated
    [strongSelf didFinish];
};
```

- `weakSelf` does not keep `self` alive → no cycle.
- `strongSelf` is a temporary strong reference valid for the block's scope → `self` can't dealloc mid-block.
- The nil check is mandatory: between capture and execution, `self` may have dealloced.

`typeof(self)` (or `__typeof(self)`) resolves to the class type at compile time and keeps the code subclass-safe.

## Toll-free bridging with CoreFoundation

CoreFoundation (`CFString`, `CFArray`, `CFDictionary`, …) and Foundation (`NSString`, `NSArray`, `NSDictionary`, …) are the same objects under the hood on Apple platforms. You can cast one to the other for free — but under ARC, the compiler needs to know **who owns the reference** so it can insert the right retains/releases.

Three cast qualifiers:

| Cast | Ownership change | Use when |
|---|---|---|
| `__bridge` | None. No retain, no release. Just reinterprets the pointer. | Casting between ObjC and CF when *you already own it the way it is* (e.g. you got it from an ObjC property and want to pass it to a CF function as a borrow). |
| `__bridge_transfer` | CF → ARC. ARC takes ownership; you do **not** need to `CFRelease`. | You called a CF `Create`/`Copy` function and want ARC to manage the result. |
| `__bridge_retained` | ARC → CF. ARC gives up ownership; **you** must `CFRelease`. | You have an ObjC object and need to hand it to CF code that will release it. |

```objc
// __bridge — no ownership change, just a borrow
NSString *ns = @"hello";
CFStringRef cf = (__bridge CFStringRef)ns;
CFShow(cf);   // borrowed, do not release

// __bridge_transfer — CF → ARC, ARC will release
CFStringRef created = CFStringCreateWithCString(NULL, "world", kCFStringEncodingUTF8);
NSString *owned = (__bridge_transfer NSString *)created;
// ARC owns `owned` now; do NOT call CFRelease(created)

// __bridge_retained — ARC → CF, you must CFRelease
NSString *objc = @"handoff";
CFStringRef handed = (__bridge_retained CFStringRef)objc;
// ARC no longer tracks `handed`; you must call CFRelease(handed) later
CFRelease(handed);
```

Mnemonic:

- `__bridge` = "look, don't touch"
- `__bridge_transfer` = "transfer **to** ARC" (CF → ObjC; you stop managing)
- `__bridge_retained` = "transfer **away from** ARC" (ObjC → CF; you start managing)

Getting this wrong leaks (you forgot to `CFRelease` after `__bridge_retained`) or crashes (you `CFRelease` something ARC owns). When in doubt, prefer `__bridge` and let the original owner keep ownership.

## Modern ARC rules checklist

A quick reference for writing correct ARC code:

- [ ] **Never call** `retain`, `release`, `autorelease`, `retainCount`, or `[super dealloc]`. ARC does it for you.
- [ ] **Never implement `dealloc` to release properties.** ARC releases your ivars automatically. Use `dealloc` only to invalidate observers, close file handles, break non-ARC cycles, or remove KVO.
- [ ] **Do implement `dealloc` for non-object cleanup** (observers, file handles, KVO removal). Do **not** call `[super dealloc]` — ARC forbids it; the compiler inserts the call.
- [ ] **Use `copy` for `NSString`, `NSArray`, `NSDictionary`, `NSSet` properties.** Always. Even if you think the source is immutable.
- [ ] **Use `weak` for delegates, data sources, observers, and back-references.** Breaks cycles.
- [ ] **Use `strong` for owned model objects and collections.** Default for object properties.
- [ ] **Use `assign` for primitives only.** For object pointers that must not be `weak` (rare), use `unsafe_unretained` explicitly so the next reader sees the intent.
- [ ] **In a block that captures `self`, use the weak/strong dance** if `self` holds the block.
- [ ] **Wrap tight loops that create many temporaries in `@autoreleasepool`** to bound peak memory.
- [ ] **When bridging to CoreFoundation, pick the cast that matches who owns the reference.** `__bridge` (no change), `__bridge_transfer` (CF → ARC), `__bridge_retained` (ARC → CF).
- [ ] **Declare nullability** (`NS_ASSUME_NONNULL_BEGIN` / `nullable`) so the ARC bridging to Swift produces correct optionals.
- [ ] **Don't use `assign` on an object to "avoid the cycle."** Use `weak`. `assign` leaves a dangling pointer at dealloc; `weak` nils it.

## What's next

Memory is the foundation. The next page covers two ways ObjC extends existing classes without subclassing: **categories** (add methods to any class, even ones you don't own) and **protocols** (define a contract any class can adopt).

**Next** → [Categories and protocols](./05-categories-and-protocols.md)
