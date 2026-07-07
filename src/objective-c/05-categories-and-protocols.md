---
title: Categories and protocols
tier: objective-c
platform: ios
---

# Categories and protocols

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › Categories and protocols

**Goal**

You will extend existing classes without subclassing using **categories**, expose private API with **class extensions**, define contracts with **protocols**, and wire up the delegation pattern that powers most of UIKit. After this page you can add a method to `NSString`, declare a `PersonDelegate` protocol, and write a complete delegate callback.

**Prerequisites**

- [04 Memory management](./04-memory-management.md)

## Categories

A **category** lets you add methods to an existing class — even one you don't own, like `NSString` or `UIView` — without subclassing and without access to its source. The added methods become part of the class for every instance in your process.

```objc
// NSString+Reverse.h
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface NSString (Reverse)

- (NSString *)reverseString;

@end

NS_ASSUME_NONNULL_END
```

```objc
// NSString+Reverse.m
#import "NSString+Reverse.h"

@implementation NSString (Reverse)

- (NSString *)reverseString {
    NSUInteger len = [self length];
    NSMutableString *reversed = [NSMutableString stringWithCapacity:len];
    for (NSInteger i = (NSInteger)len - 1; i >= 0; i--) {
        unichar c = [self characterAtIndex:(NSUInteger)i];
        [reversed appendFormat:@"%C", c];
    }
    return [reversed copy];
}

@end
```

Now every `NSString` in your app responds to `reverseString`:

```objc
#import "NSString+Reverse.h"

NSString *original = @"hello";
NSLog(@"%@", [original reverseString]);   // olleh
```

Anatomy of the category declaration:

```
@interface NSString (Reverse)
            ^         ^
            class     category name (any identifier, must be unique)
```

The category name appears in parentheses. It is not a new class — there is no `: SuperClass` and no `@property` synthesis for stored state (more on that below). A category file is conventionally named `ClassName+CategoryName.h/.m`.

### Why categories exist

| Use case | Example |
|---|---|
| Add methods to a framework class you can't subclass meaningfully. | Adding `reverseString` to `NSString`, or a `-[UIImage imageWithCornerRadius:]` helper. |
| Split a large class's implementation across multiple `.m` files for organization. | A 2000-line `ViewController.m` split into `ViewController (Networking)` and `ViewController (Layout)` files. |
| Declare private methods so the compiler sees them before use. | Forward-declaring a helper method used above its definition in the same `.m`. |

::: tip Subclass vs category
If you need to *add stored state* or *override existing methods*, subclass. If you only need to *add methods* and want them on every instance of the existing class (including ones the framework creates), category.
:::

### Category caveats

Categories have sharp limitations that trip up newcomers:

- **You cannot add stored properties (ivars) to a category.** A category can declare `@property`, but the compiler will not synthesize a backing ivar or accessor methods for it. The property is just a declaration — calling the getter crashes at runtime unless you implement the accessors yourself using **associated objects** (see below).
- **Method name collisions are undefined behavior.** If two categories on the same class define the same selector, which one "wins" is undefined — it depends on load order. Never duplicate an existing framework selector in a category; if you need different behavior, subclass instead.
- **You cannot override existing framework methods reliably in a category.** It compiles, but the behavior is fragile and you lose the ability to call the original. Use a subclass and call `super`.

### Associated objects — faking stored state in a category

When you genuinely need to attach state to an existing class in a category, the Objective-C runtime provides **associated objects** — a runtime-level key-value store attached to any object instance.

```objc
// UIView+Badge.h
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface UIView (Badge)

@property (nonatomic, strong, nullable) NSString *badgeText;

@end

NS_ASSUME_NONNULL_END
```

```objc
// UIView+Badge.m
#import "UIView+Badge.h"
#import <objc/runtime.h>

static const void *BadgeTextKey = &BadgeTextKey;

@implementation UIView (Badge)

- (NSString *)badgeText {
    return objc_getAssociatedObject(self, BadgeTextKey);
}

- (void)setBadgeText:(NSString *)badgeText {
    objc_setAssociatedObject(self, BadgeTextKey, badgeText, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

@end
```

The signatures:

```objc
void objc_setAssociatedObject(id object, const void *key, id value, objc_AssociationPolicy policy);
id  objc_getAssociatedObject(id object, const void *key);
```

- `key` is a `const void *` — you pass the address of a `static` variable so each key is unique and stable. Two different `static` variables have two different addresses, so they never collide.
- `policy` mirrors `@property` memory semantics:

| Policy | Equivalent `@property` attribute |
|---|---|
| `OBJC_ASSOCIATION_ASSIGN` | `assign` (rare — unsafe, not nil-ed) |
| `OBJC_ASSOCIATION_RETAIN_NONATOMIC` | `strong, nonatomic` |
| `OBJC_ASSOCIATION_RETAIN` | `strong, atomic` |
| `OBJC_ASSOCIATION_COPY_NONATOMIC` | `copy, nonatomic` |
| `OBJC_ASSOCIATION_COPY` | `copy, atomic` |

::: warning Use associated objects sparingly
Associated objects are a power tool, not a default. They hide state, defeat the type system, and make ownership hard to reason about. If you find yourself attaching lots of state to a class you don't own, you almost certainly want a subclass or a wrapper object instead.
:::

## Class extensions (anonymous categories)

A **class extension** looks like a category with no name in parentheses:

```objc
@interface Person ()
@property (nonatomic, assign, readwrite) NSInteger age;   // private readwrite
- (void)incrementAge;
@end
```

Unlike a named category, a class extension **can** add stored properties (the compiler synthesizes the ivar) and **must** be defined in the class's own implementation file. It is the idiomatic place for:

- Redeclaring a public `readonly` property as `readwrite` so your own methods can mutate it (the synthesized setter is private — outside callers see no setter).
- Declaring private methods and properties that should not appear in the public header.

Page 03 used this exact pattern. The extension lives at the top of `Person.m`, never in the `.h`:

```objc
// Person.m
#import "Person.h"

@interface Person ()
@property (nonatomic, assign, readwrite) NSInteger age;
@end

@implementation Person
// age is settable here via self.age = ..., but not from outside
@end
```

| | Named category `ClassName (Name)` | Class extension `ClassName ()` |
|---|---|---|
| Where defined | Anywhere (often its own `.h`/`.m`) | Only in the class's own `.m` |
| Can add stored properties? | No (unless you use associated objects) | Yes — compiler synthesizes ivar |
| Visibility | Public if in a `.h`, private if in a `.m` | Private to the implementation |

## Protocols

A **protocol** is a list of method declarations that any class can promise to implement — the ObjC equivalent of a Swift protocol or a Java/Go interface. It declares a *contract* without an implementation and without tying the conforming class to any particular superclass.

### Defining a protocol

```objc
// PersonDelegate.h
#import <Foundation/Foundation.h>

@class Person;   // forward declaration — breaks the import cycle

NS_ASSUME_NONNULL_BEGIN

@protocol PersonDelegate <NSObject>

@required
- (void)personDidFinishTask:(Person *)person;

@optional
- (void)person:(Person *)person didProgressTo:(float)fraction;
- (BOOL)personShouldBeginTask:(Person *)person;

@end

NS_ASSUME_NONNULL_END
```

Anatomy:

```
@protocol PersonDelegate <NSObject>
                     ^        ^
                     name     protocol this extends (NSObject protocol is conventional)
```

- `@required` (the default) methods **must** be implemented by conforming classes. The compiler warns if they're missing; calling a missing required method is a programmer error.
- `@optional` methods **may** be implemented. Callers must check with `respondsToSelector:` before sending an optional message — the object is not guaranteed to respond.
- `<NSObject>` as the inherited protocol is conventional: it gives you `respondsToSelector:`, `isEqual:`, `hash`, etc. on any conforming object.

::: tip @class forward declarations
`@class Person;` tells the compiler "a class named `Person` exists" without importing its full header. Use it in headers to break import cycles: `Person.h` imports `PersonDelegate.h` (to adopt the protocol), and `PersonDelegate.h` forward-declares `Person` (so it can reference it in method signatures) — no cycle.
:::

### Conforming to a protocol

A class adopts a protocol by listing it in angle brackets after the superclass:

```objc
@interface MyClass : SuperClass <Protocol1, Protocol2>
```

Here is a `Person` that takes a delegate and calls back to it:

```objc
// Person.h
#import <Foundation/Foundation.h>
#import "PersonDelegate.h"

NS_ASSUME_NONNULL_BEGIN

@interface Person : NSObject

@property (nonatomic, copy, readonly) NSString *name;
@property (nonatomic, weak, nullable) id <PersonDelegate> delegate;

- (instancetype)initWithName:(NSString *)name;
- (void)performTask;

@end

NS_ASSUME_NONNULL_END
```

```objc
// Person.m
#import "Person.h"

@implementation Person

- (instancetype)initWithName:(NSString *)name {
    self = [super init];
    if (self) {
        _name = [name copy];
    }
    return self;
}

- (void)performTask {
    // Optional: ask the delegate for permission before starting.
    if ([self.delegate respondsToSelector:@selector(personShouldBeginTask:)]) {
        if (![self.delegate personShouldBeginTask:self]) {
            return;   // delegate said "don't start"
        }
    }

    // ... do the work ...

    // Optional: report progress.
    if ([self.delegate respondsToSelector:@selector(person:didProgressTo:)]) {
        [self.delegate person:self didProgressTo:0.5f];
    }

    // Required: notify completion.
    [self.delegate personDidFinishTask:self];
}

@end
```

Two things to notice:

1. **The delegate is `weak`.** This is the cycle-breaking rule from page 04: the delegating object does not own its delegate. If `Person` retained its delegate and the delegate retained `Person`, neither would ever dealloc.
2. **Optional methods are guarded with `respondsToSelector:`.** Required methods you can call directly; optional ones you must check first, because the delegate may not have implemented them.

### The type `id <ProtocolName>`

`id <PersonDelegate> delegate` reads as "any object, of any class, that conforms to `PersonDelegate`." It is the most idiomatic delegate type: it does not pin the delegate to a specific class (your delegate could be a view controller, a view model, anything), but it does guarantee the methods in the protocol exist.

You can stack multiple protocols: `id <Protocol1, Protocol2>`. You can also constrain a concrete class: `UIViewController <PersonDelegate> *` means "a `UIViewController` that also conforms to `PersonDelegate`."

### Checking conformance at runtime

```objc
// "Does this object conform to this protocol at all?"
BOOL ok = [obj conformsToProtocol:@protocol(PersonDelegate)];

// "Does this object respond to this particular selector?"
BOOL can = [obj respondsToSelector:@selector(personDidFinishTask:)];
```

- `conformsToProtocol:` takes a `Protocol *`, obtained with the `@protocol(Name)` compiler expression. It returns `YES` if the object's class (or any superclass) declares conformance.
- `respondsToSelector:` takes a `SEL`, obtained with `@selector(selectorName)`. It returns `YES` if the object actually implements that method.

`respondsToSelector:` is the one you use day-to-day — it's how you safely call `@optional` protocol methods.

### A complete delegate example

Putting it together — a `Boss` class that conforms to `PersonDelegate` and reacts to a `Person`'s task:

```objc
// Boss.h
#import <Foundation/Foundation.h>
#import "PersonDelegate.h"

@interface Boss : NSObject <PersonDelegate>
- (void)supervise:(Person *)worker;
@end
```

```objc
// Boss.m
#import "Boss.h"
#import "Person.h"

@implementation Boss

- (void)supervise:(Person *)worker {
    worker.delegate = self;          // weak back-reference, no cycle
    [worker performTask];            // Boss will be called back as the delegate
}

#pragma mark - PersonDelegate

- (BOOL)personShouldBeginTask:(Person *)person {
    NSLog(@"%@ may begin.", person.name);
    return YES;
}

- (void)person:(Person *)person didProgressTo:(float)fraction {
    NSLog(@"%@ is %.0f%% done.", person.name, fraction * 100.0f);
}

- (void)personDidFinishTask:(Person *)person {
    NSLog(@"%@ finished.", person.name);
}

@end
```

```objc
// main.m
#import <Foundation/Foundation.h>
#import "Person.h"
#import "Boss.h"

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        Person *worker = [[Person alloc] initWithName:@"Mei"];
        Boss *boss = [[Boss alloc] init];
        [boss supervise:worker];
    }
    return 0;
}
```

This is the shape of almost every delegation in UIKit: `UITableView` has a `delegate` (`id <UITableViewDelegate>`) and a `dataSource` (`id <UITableViewDataSource>`), both `weak`, and it calls `@optional` methods on them after checking `respondsToSelector:`. Once you can read the `Person`/`Boss` example, you can read `UITableView`/`UIViewController`.

## Informal protocols (legacy)

Before the `@optional` keyword existed (Objective-C 2.0, 2006), protocols were all-`@required`, so optional callbacks were implemented as a plain `@interface` with method stubs that returned default values — an **informal protocol**. `NSObject` itself used to carry informal-protocol methods like `-awakeFromNib` and `-prepareForInterfaceBuilder` so any subclass could override them.

You will still see this in older code: a category on `NSObject` that declares methods with empty implementations, which subclasses override as needed. Modern code uses formal `@protocol` with `@optional` instead — it is type-checked and self-documenting.

## What's next

You can now extend classes and define contracts. The next page covers the value types you'll use constantly: `NSString`, `NSArray`, `NSDictionary`, `NSNumber`, and the **class cluster** pattern that makes them work — plus how they map to Swift.

**Next** → [Foundation essentials](./06-foundation-essentials.md)
