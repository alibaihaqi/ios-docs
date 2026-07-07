---
title: Error handling
tier: objective-c
platform: ios
---

# Error handling

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › Error handling

**Goal**

You will handle and produce failures the Objective-C way — the `NSError **` double-pointer out-parameter pattern that replaces exceptions for expected errors. You will understand the three parts of an `NSError` (domain, code, userInfo), how to author methods that vend errors, when `@try`/`@catch` is actually appropriate, and how the same scenario looks in Swift `throws`/`catch`. After this page you can read any Foundation API that ends in `error:` and write your own.

**Prerequisites**

- [08 UIKit with ObjC](./08-uikit-with-objc.md)

## Why not exceptions

Objective-C *has* exceptions — `@try` / `@catch` / `@finally` — but they are reserved for **programmer error**: a broken invariant, an out-of-bounds index, a nil where a nonnil was required. They are not used for expected, recoverable failure (a file that doesn't exist, a network timeout, a bad password). The reasons are practical:

- ObjC exceptions are implemented on top of the C runtime's `setjmp`/`longjmp`. They do **not** unwind cleanly through ARC-compiled frames — resources may leak, partially-constructed objects may be left in invalid states.
- Most framework code is not exception-safe. If an exception escapes past a Foundation method, invariants are not guaranteed to hold.
- ARC makes manual cleanup in `@finally` fragile; you cannot reliably `release` what you never retained.

So for the expected-failure case, Cocoa uses a different mechanism: a method returns a sentinel (usually `BOOL` or `nil`) and, *if the caller wants to know why*, fills in an `NSError *` through an out-parameter. The caller can ignore the reason by passing `NULL`.

## The NSError double-pointer pattern

This is the single most important idiom in Cocoa error handling. A method that can fail takes a final `NSError **` parameter. On failure it returns `NO` (or `nil`) and writes an error object through that pointer:

```objc
NSError *error = nil;
BOOL success = [fileManager removeItemAtPath:path error:&error];
if (!success) {
    NSLog(@"Failed: %@", error.localizedDescription);
}
```

Read the call from right to left:

1. Declare `NSError *error = nil;` — a nil error pointer. (Always initialize to `nil`; some APIs rely on it.)
2. Pass `&error` — the **address of the pointer**. That is a pointer-to-pointer, `NSError **`, which is what the parameter type is.
3. The method returns `BOOL`. `NO` means failure; `error` is now non-nil and describes what went wrong.
4. `YES` means success; `error` is untouched (still `nil`). Never inspect `error` to decide success — check the return value. A method is free to leave `error` in any state on the success path.

::: warning Check the return value, not the error
Beginners write `if (error) { ... }`. That is wrong. Some APIs set a transient error object even on success, or reuse the pointer. The contract is: the **return value** tells you success/failure; `error` is only meaningful when the return value indicates failure. Always branch on `success`, then read `error` inside the failure branch.
:::

## The three parts of an NSError

`NSError` is a small immutable object with three properties:

| Property | Type | Meaning |
|---|---|---|
| `domain` | `NSString *` | A string namespace identifying who produced the error. Prevents code collisions between subsystems. |
| `code` | `NSInteger` | A numeric error code, unique *within the domain*. |
| `userInfo` | `NSDictionary *` | Arbitrary extra data — the localized message, the underlying cause, recovery suggestions. |

`domain` + `code` together form the identity of an error. `NSURLErrorDomain` code `-1004` (cannot connect to host) is distinct from `NSCocoaErrorDomain` code `4` (`NSFileNoSuchFileError`). The same numeric code means different things in different domains — that is why the domain matters.

## Common domains

You will see these constantly:

- **`NSCocoaErrorDomain`** — the umbrella for Foundation/AppKit/UIKit errors. File I/O, Core Data, property-list parsing. Codes are often symbolic constants like `NSFileNoSuchFileError` (= `4`) or `NSValidationError`.
- **`NSURLErrorDomain`** — `NSURLSession` / `NSURLConnection` network errors. `-1000` range: `-1001` timed out, `-1003` cannot find host, `-1004` cannot connect, `-1009` not connected to internet.
- **`NSPOSIXErrorDomain`** — wrapped POSIX `errno` values. `ENOENT` = `2`, `EACCES` = `13`. Often appears as the `NSUnderlyingErrorKey` inside a Cocoa-domain error.
- **`NSOSStatusErrorDomain`** — `OSStatus` codes from Carbon/CoreAudio/Security. Four-character codes like `'!tvn'`.
- **`NSMachErrorDomain`** — low-level Mach kernel errors.

When you author your own errors, pick a domain string unique to your app — conventionally the bundle identifier or a reverse-DNS prefix: `com.example.MyApp`.

## Creating your own errors

Use `+errorWithDomain:code:userInfo:` (or `initWithDomain:code:userInfo:`):

```objc
NSError *error = [NSError errorWithDomain:@"com.example.MyApp"
                                      code:1001
                                  userInfo:@{
    NSLocalizedDescriptionKey: @"The login token has expired",
    NSLocalizedFailureReasonErrorKey: @"Token lifetime is 1 hour; refresh required",
    NSRecoverySuggestionErrorKey: @"Sign in again to obtain a new token."
}];

NSLog(@"%@", error.localizedDescription);           // The login token has expired
NSLog(@"%@", error.localizedFailureReason);         // Token lifetime is 1 hour; refresh required
NSLog(@"%@", error.localizedRecoverySuggestion);    // Sign in again to obtain a new token.
```

`userInfo` is the carrier for everything human-facing and everything diagnostic. The standard keys (all defined in `NSError.h`) are:

| Key | Reads as | When to set |
|---|---|---|
| `NSLocalizedDescriptionKey` | `localizedDescription` | Always. A short, end-user-facing sentence. |
| `NSLocalizedFailureReasonErrorKey` | `localizedFailureReason` | Why it failed, technical but readable. |
| `NSLocalizedRecoverySuggestionErrorKey` | `localizedRecoverySuggestion` | What the user can do about it. |
| `NSLocalizedRecoveryOptionsErrorKey` | `localizedRecoveryOptions` | Array of button titles for recovery. |
| `NSUnderlyingErrorKey` | — | The root-cause error you wrapped (e.g. a POSIX error inside a Cocoa error). |
| `NSFilePathErrorKey` | — | The path involved in a file error. |
| `NSURLErrorFailingURLErrorKey` | — | The URL involved in a network error. |

Always set at least `NSLocalizedDescriptionKey`. The other keys populate the convenience accessors (`localizedFailureReason`, etc.) that an alert UI can display.

## Writing methods that accept NSError **

Here is the full pattern. A method that can fail declares a trailing `NSError **` parameter, returns `BOOL` (or an object/`nil`), and writes the error only on failure:

```objc
// TokenStore.h
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface TokenStore : NSObject
// Inside an NS_ASSUME_NONNULL region, a bare NSError ** has both pointers
// inferred as nullable, and Swift imports this as `func loadToken() throws`.
- (BOOL)loadTokenWithError:(NSError **)error;
@end

NS_ASSUME_NONNULL_END
```

```objc
// TokenStore.m
#import "TokenStore.h"

static NSString *const MyAppErrorDomain = @"com.example.MyApp";

enum {
    MyAppErrorCodeTokenMissing = 1001,
    MyAppErrorCodeTokenExpired = 1002,
};

@implementation TokenStore

- (BOOL)loadTokenWithError:(NSError **)error {
    NSString *token = [self readTokenFromKeychain];
    if (!token) {
        if (error) {
            *error = [NSError errorWithDomain:MyAppErrorDomain
                                          code:MyAppErrorCodeTokenMissing
                                      userInfo:@{
                NSLocalizedDescriptionKey: @"No saved login token",
                NSLocalizedFailureReasonErrorKey: @"Keychain has no token for this account.",
                NSLocalizedRecoverySuggestionErrorKey: @"Sign in to create one."
            }];
        }
        return NO;
    }

    if ([self tokenIsExpired:token]) {
        if (error) {
            *error = [NSError errorWithDomain:MyAppErrorDomain
                                          code:MyAppErrorCodeTokenExpired
                                      userInfo:@{
                NSLocalizedDescriptionKey: @"The login token has expired"
            }];
        }
        return NO;
    }

    return YES;
}

- (NSString *)readTokenFromKeychain { return nil; }   // stub for illustration
- (BOOL)tokenIsExpired:(NSString *)token { return NO; }

@end
```

Three things to internalize:

1. **Check `if (error)` before writing `*error`.** The caller is allowed to pass `NULL` (they don't care about the reason). Dereferencing a NULL pointer-to-pointer crashes. Guard it.
2. **Only write `*error` on the failure path.** On success, leave it untouched.
3. **`NSError **` inside `NS_ASSUME_NONNULL_BEGIN/END` is auto-inferred as `NSError * _Nullable * _Nullable`**, and the Swift importer recognizes the `BOOL`-plus-trailing-`NSError **` shape as a throwing function. Swift callers write `try store.loadToken()` — no error parameter, no BOOL.

::: tip Symbolic codes beat magic numbers
Define your error codes as an `enum` (or `NS_ERROR_ENUM`) in the header, not as bare integers in the `.m`. Callers need to `switch` on the code to recover, and they can't do that against a private list of numbers. Public domain + public `NS_ERROR_ENUM` is the full Cocoa contract.
:::

## Wrapping an underlying error

When you translate a low-level error into your own domain, preserve the cause with `NSUnderlyingErrorKey`:

```objc
- (BOOL)writeData:(NSData *)data toFile:(NSString *)path error:(NSError **)error {
    NSError *writeError = nil;
    [data writeToFile:path options:NSDataWritingAtomic error:&writeError];
    if (writeError) {
        if (error) {
            *error = [NSError errorWithDomain:MyAppErrorDomain
                                          code:MyAppErrorCodeWriteFailed
                                      userInfo:@{
                NSLocalizedDescriptionKey: @"Could not save the document",
                NSUnderlyingErrorKey: writeError   // preserve the POSIX/Cocoa root cause
            }];
        }
        return NO;
    }
    return YES;
}
```

A debugger (or your logging) can walk the `NSUnderlyingErrorKey` chain down to the real reason — a POSIX `ENOENT` wrapped in a Cocoa file error wrapped in your app error.

## @try / @catch / @finally

Exceptions exist and occasionally you must use them — but the use cases are narrow:

- Catching an `NSException` thrown by a third-party library you cannot fix (some older ObjC libraries throw for control flow).
- Guarding against a known runtime issue during development (an array-out-of-bounds in a path you want to log rather than crash).
- Implementing a custom `@catch` at a top-level boundary (e.g. an `NSExceptionHandler` on the main run loop) to log and report crashes.

```objc
@try {
    NSArray *arr = @[@"a"];
    NSString *third = arr[2];   // throws NSRangeException
} @catch (NSException *exception) {
    NSLog(@"Caught: %@ — %@", exception.name, exception.reason);
} @finally {
    // always runs, success or failure
    NSLog(@"cleanup");
}
```

Key facts about ObjC exceptions:

- The caught object is an `NSException *` (not an `NSError *`). It has `name`, `reason`, `userInfo`, and a `callStackSymbols` array.
- Common names: `NSRangeException`, `NSInvalidArgumentException`, `NSInternalInconsistencyException`, `NSGenericException`.
- You can `@throw` your own: `@throw [NSException exceptionWithName:@"MyException" reason:@"..." userInfo:nil];` — but in modern code, prefer `NSAssert`/`NSCAssert` for invariants and `NSError **` for expected failures.
- `@finally` runs whether or not an exception was thrown. Under ARC, do not put `release` calls in it — ARC manages ownership; use it only for non-ObjC cleanup (closing a file descriptor, freeing a malloc'd buffer).

::: warning Exceptions are not Swift errors
Swift's `catch` cannot catch an Objective-C `NSException`. If ObjC code throws an exception that crosses into Swift, the process crashes. Exceptions must be caught on the ObjC side, never allowed to propagate across the language boundary.
:::

## Comparing with Swift throws / catch

The same scenario — load a token, fail with a typed error — in both languages.

**Objective-C** (caller side):

```objc
NSError *error = nil;
if (![store loadTokenWithError:&error]) {
    NSLog(@"Failed: %@", error.localizedDescription);
    return;
}
// proceed with the token
```

**Swift**, where the ObjC method has been imported as `throws`:

```swift
do {
    try store.loadToken()
    // proceed with the token
} catch {
    print("Failed: \(error.localizedDescription)"
}
```

What Swift gave you here is substantial: the error is part of the type signature, the compiler forces the `try`, and `catch` is exhaustive over `Error`. In ObjC the `BOOL`-plus-out-error contract is a *convention* — the compiler does not enforce it, and a caller can silently ignore the `NSError **` by passing `NULL`. The convention is universally followed in Cocoa, which is why it works, but Swift made it a language feature.

## What's next

You can now read every `error:` API in Foundation and produce your own typed failures. The next page covers ObjC's two observation primitives — **Key-Value Observing** (reacting to property changes) and **NSNotificationCenter** (broadcast-style messaging) — including the `context` pointer trick, removal discipline, and how they map to Swift's `Combine`.

**Next** → [KVO and NotificationCenter](./10-kvo-notificationcenter.md)
