---
title: Blocks
tier: objective-c
platform: ios
---

# Blocks

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › Blocks

**Goal**

You will read and write Objective-C **blocks** — C-level closures that capture surrounding state. You will master the famously awkward block syntax (and the `typedef` that tames it), understand capture-by-value vs `__block`, and apply the **weak/strong dance** to break retain cycles. After this page you can write a network method with a completion handler.

**Prerequisites**

- [06 Foundation essentials](./06-foundation-essentials.md)

## What a block is

A block is an anonymous function — a closure — that captures the variables in scope where it is defined. It is a C language extension (`Blocks` are to ObjC what closures/lambdas are to Swift): a chunk of code you can pass around, that remembers the variables it was created with.

You use blocks constantly in iOS:

- **Completion handlers** — `[service fetchWithCompletion:^{ ... }]`.
- **Enumeration** — `[array enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL *stop){ ... }]`.
- **GCD** — `dispatch_async(queue, ^{ ... })`.
- **Animations** — `[UIView animateWithDuration:0.3 animations:^{ ... }]`.

## Block syntax

Block syntax is the hardest part of ObjC for newcomers, because the type declaration reads inside-out. Break it into two pieces: the **declaration** (a variable that holds a block) and the **literal** (the block itself).

### Declaring a block variable

```objc
void (^simpleBlock)(void);
```

Read this as: "`simpleBlock` is a block that takes `void` (no parameters) and returns `void`." The caret (`^`) marks it as a block type. The general shape is:

```
returnType (^blockName)(parameterTypes);
```

### Assigning a block literal

```objc
simpleBlock = ^{
    NSLog(@"hello");
};
```

A block literal starts with `^` and the body is in braces. When the block takes no arguments and returns `void`, you can omit the parameter list.

### Blocks with parameters

```objc
void (^greet)(NSString *) = ^(NSString *name) {
    NSLog(@"hi %@", name);
};
greet(@"Mei");    // hi Mei
```

For a block that returns a value, write the return type before the caret, or let the compiler infer it:

```objc
// Explicit return type:
int (^square)(int) = ^int(int x) {
    return x * x;
};

// Inferred return type (the compiler sees `return x * x` → int):
int (^alsoSquare)(int) = ^(int x) {
    return x * x;
};
```

### typedef — tame the syntax

Writing `void (^)(NSString *)` inline is unreadable. The idiomatic fix is a `typedef` that names the block type, after which you use it like any other type:

```objc
typedef void (^CompletionHandler)(BOOL success, NSError *error);

// Now the type reads cleanly everywhere:
@property (nonatomic, copy) CompletionHandler onComplete;

- (void)fetchWithCompletion:(CompletionHandler)completion;
```

::: tip Always typedef public block types
Any block type that appears in a public header (a property, a method parameter, a return value) should get a `typedef`. It makes the header readable, gives the type a meaningful name (`CompletionHandler`, `TableViewCellConfigurator`), and ensures the signature is consistent across the API.
:::

### `copy` for block properties

Block literals start life on the **stack**. To keep a block alive past the scope that created it (storing it in a property, an ivar, a collection), you must move it to the heap with `copy`. Under ARC, a `@property (copy)` declared on a block type does this automatically — always use `copy`, never `strong`, for block properties:

```objc
@property (nonatomic, copy) void (^onComplete)(void);   // correct — copies to heap
@property (nonatomic, strong) void (^onComplete)(void); // wrong — may be a dangling stack block
```

## Capturing variables

A block captures the variables visible in the scope where it is created. By default it captures **by value** — a snapshot of the variable at the moment the block is created:

```objc
int counter = 0;
void (^bump)(void) = ^{
    NSLog(@"%d", counter);   // captured value: 0
};
counter = 100;                // reassign the outer variable
bump();                       // prints 0, not 100
```

### `__block` for mutable capture

If the block needs to *modify* the captured variable (not just read a snapshot), mark the variable `__block`. This moves the variable into a heap-allocated box that both the block and the surrounding scope share:

```objc
__block int total = 0;
NSArray *counts = @[@1, @2, @3];
[counts enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL *stop) {
    total += [obj integerValue];     // modifying the captured variable
}];
NSLog(@"%d", total);                 // 6
```

Without `__block`, the line `total += ...` is a compiler error — you cannot assign to a by-value-captured variable.

::: warning Captured objects are retained
When a block captures an Objective-C object pointer, it **retains** that object (a `__strong` capture by default). The object stays alive at least as long as the block does. This is the mechanism behind the retain-cycle problem below — and it is why `__block` on an object pointer also retains it (older code sometimes used `__block` to avoid capture-retain; under ARC that no longer works — use `__weak`).
:::

## The weak/strong dance

This is the #1 blocks gotcha and the most common bug in ObjC codebases. Page 04 introduced it; here is the full picture.

If a block captures `self` strongly, and `self` holds the block strongly (directly or indirectly), you have a **retain cycle** — neither can ever dealloc:

```objc
// BUG: retain cycle
self.onComplete = ^{
    [self saveData];   // block retains self; self retains block → leak
};
```

The fix is to capture `self` **weakly**, then re-strengthen it *inside* the block so it cannot dealloc mid-execution:

```objc
__weak typeof(self) weakSelf = self;
self.onComplete = ^{
    __strong typeof(weakSelf) strongSelf = weakSelf;
    if (!strongSelf) return;            // self already deallocated before the block ran
    [strongSelf saveData];              // safe: strongSelf is alive for the block's scope
};
```

Step by step:

1. `__weak typeof(self) weakSelf = self;` — a non-owning reference. It does not keep `self` alive, so no cycle. If `self` deallocs, `weakSelf` is auto-set to `nil`.
2. `__strong typeof(weakSelf) strongSelf = weakSelf;` — a temporary strong reference taken *when the block runs*. It keeps `self` alive for the duration of the block so it cannot vanish mid-method.
3. `if (!strongSelf) return;` — mandatory. Between capture and execution, `self` may have dealloced. Sending messages to `nil` is safe in ObjC, but you usually want to bail out rather than run half a method.
4. `typeof(self)` resolves to the actual class type at compile time, so the code is subclass-safe and you keep full type information on `strongSelf`.

::: tip When do you actually need the dance?
Only when **the block is retained by `self`** (a property, an ivar, a strong path). A block passed to a short-lived API and not stored — `[UIView animateWithDuration:animations:]`, a one-shot `dispatch_async` to the main queue that doesn't capture `self` into storage — does **not** need it, because there's no cycle. When in doubt, use it; the cost is two lines and a nil check.
:::

## GCD — Grand Central Dispatch with blocks

GCD is Apple's C-level concurrency API, and its entire interface is block-based. The two calls you will use most:

```objc
// Run work on a background queue:
dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    NSData *data = [NSData dataWithContentsOfURL:url];   // blocking I/O off the main thread
    NSString *text = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];

    // Hop back to the main thread to touch the UI:
    dispatch_async(dispatch_get_main_queue(), ^{
        self.label.text = text;
    });
});
```

- `dispatch_async(queue, block)` — schedules `block` on `queue` and returns immediately; the block runs later on that queue's thread.
- `dispatch_get_main_queue()` — the serial queue tied to the main thread. **All UI work must happen here.**
- `dispatch_get_global_queue(QOS_CLASS_…, 0)` — a shared concurrent background queue, classified by quality-of-service (`QOS_CLASS_USER_INITIATED`, `QOS_CLASS_UTILITY`, etc.).

The weak/strong dance applies here too: the background block captures `self` (via `self.label`), so if `self` could dealloc before the block runs, capture weakly first.

## The completion handler pattern

The standard asynchronous API shape in ObjC is a method that takes a completion block and calls it when the work is done — usually on a background queue. Here is a complete, correct example:

```objc
// NetworkService.h
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^FetchCompletion)(NSData * _Nullable data, NSError * _Nullable error);

@interface NetworkService : NSObject

- (void)fetchURL:(NSURL *)url completion:(FetchCompletion)completion;

@end

NS_ASSUME_NONNULL_END
```

```objc
// NetworkService.m
#import "NetworkService.h"

@implementation NetworkService

- (void)fetchURL:(NSURL *)url completion:(FetchCompletion)completion {
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        NSData *data = [NSData dataWithContentsOfURL:url];
        NSError *error = nil;
        if (!data) {
            error = [NSError errorWithDomain:@"NetworkService"
                                        code:-1
                                    userInfo:@{NSLocalizedDescriptionKey: @"fetch failed"}];
        }

        // Callers expect completion on the main thread — hop back.
        dispatch_async(dispatch_get_main_queue(), ^{
            completion(data, error);
        });
    });
}

@end
```

And the call site, with the weak/strong dance because the view controller holds itself alive long enough to receive the result:

```objc
// MyViewController.m
#import "MyViewController.h"
#import "NetworkService.h"

@implementation MyViewController

- (void)loadData {
    NetworkService *service = [[NetworkService alloc] init];
    NSURL *url = [NSURL URLWithString:@"https://example.com/data.json"];

    __weak typeof(self) weakSelf = self;
    [service fetchURL:url completion:^(NSData *data, NSError *error) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf) return;

        if (error) {
            [strongSelf showError:error];
            return;
        }
        [strongSelf renderData:data];
    }];
}

- (void)renderData:(NSData *)data { /* ... */ }
- (void)showError:(NSError *)error { /* ... */ }

@end
```

Notice the pattern is self-similar with the delegate example from page 05, but inverted: a delegate wires up a long-lived relationship, while a completion handler is a one-shot callback. Modern Swift replaces both with `async/await` and `Codable`, but the underlying machinery — hop to a background queue, do the work, hop back to main, deliver the result — is identical.

## Blocks vs Swift closures

| Objective-C | Swift |
|---|---|
| `void (^block)(void)` | `() -> Void` |
| `^(NSString *name){ ... }` | `{ name in ... }` |
| `typedef void (^Completion)(NSData *, NSError *);` | `typealias Completion = (Data, Error) -> Void` |
| `__block int x` (mutable capture) | `var x` captured by reference automatically |
| `__weak typeof(self) weakSelf = self;` + strong dance | `[weak self] in` capture list + `guard let self else { return }` |
| `@property (copy) CompletionHandler cb;` | `var cb: Completion?` (closures are reference types, escaped automatically) |
| `dispatch_async(queue, ^{...})` | `DispatchQueue.global().async { ... }` |

The biggest win moving to Swift: the weak/strong dance collapses into a one-line capture list (`[weak self]`), and mutable capture is the default for `var` bindings — no `__block` keyword. But the underlying concept (capture semantics, retain cycles, hopping queues) is identical, so understanding blocks pays off in Swift too.

## What's next

You can now write asynchronous, callback-driven code. The next page brings everything together on the UI layer — **UIKit** — covering the view-controller lifecycle, target-action, `IBOutlet`/`IBAction`, and programmatic Auto Layout, all in Objective-C.

**Next** → [UIKit with ObjC](./08-uikit-with-objc.md)
