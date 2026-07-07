---
title: Syntax foundations
tier: objective-c
platform: ios
---

# Syntax foundations

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › Syntax foundations

**Goal**

You will learn the Objective-C syntax that differs from Swift and from plain C: message sending, dot notation, the header/implementation file split, imports, pragma marks, and the C types ObjC inherits. After this page you can read a small `.h` / `.m` pair and know what every token does.

**Prerequisites**

- [01 Why Objective-C](./01-why-objective-c.md)

## Message sending

Objective-C's defining feature. You do not *call a method* on an object — you *send a message* to it. The runtime looks up the message (the **selector**) on the receiver at dispatch time and invokes whatever implementation is currently bound.

Syntax: wrap the receiver and the message in square brackets.

```objc
[receiver message];              // no argument
[receiver doThingWith:arg];      // one argument
[receiver doThingWith:arg other:arg2];   // two arguments (label interleaved)
```

The same expression in Swift and in C, for contrast:

| Language | Syntax | Dispatch |
|---|---|---|
| Objective-C | `[view addSubview:label];` | Runtime message send (`objc_msgSend`) |
| Swift | `view.addSubview(label)` | Direct or vtable (unless `@objc dynamic`) |
| C | `addSubview(view, label);` | Direct function call (compile-time) |

A multi-argument message reads naturally because the labels are part of the selector name:

```objc
UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
[button setTitle:@"Save" forState:UIControlStateNormal];
[button addTarget:self action:@selector(saveTapped:) forControlEvents:UIControlEventTouchUpInside];
```

The selector for the second line is `setTitle:forState:` — the whole thing, colons included, is the message name.

Nesting is legal and common; just keep brackets balanced:

```objc
NSString *upper = [[button titleForState:UIControlStateNormal] uppercaseString];
```

Read this inside-out: get the title, then call `uppercaseString` on the result.

::: warning Brackets are not optional
Every message send is wrapped in `[ ]`. Forgetting a closing `]` is the most common compile error for newcomers. Xcode will usually point at the line *after* the real problem.
:::

## Dot notation

Objective-C has dot syntax for *property accessors* only — it is syntactic sugar for a getter or setter message send, not a field access.

```objc
person.name          // == [person name]
person.name = @"Mei" // == [person setName:@"Mei"]
```

The compiler rewrites the dot to a message send. This matters: `person.name` is *not* a struct member access — it goes through the accessor method, which may have side effects. Dot syntax on a non-property (a raw method like `count`) also works, but is stylistically discouraged. Use it for properties; use brackets for everything else.

```objc
NSArray *items = @[ @"a", @"b", @"c" ];
NSLog(@"%lu", (unsigned long)items.count);   // works, but prefer [items count]
```

## Header vs implementation

Objective-C splits a class across two files:

- **`.h`** — the **interface** (public API). Declares the superclass, adopted protocols, public properties, and public method signatures. Other files `#import` this.
- **`.m`** — the **implementation**. Defines the methods. Private methods and ivars live here, invisible to other files.

A complete minimal class:

```objc
// Person.h
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface Person : NSObject

@property (nonatomic, copy, readonly) NSString *name;
@property (nonatomic, assign, readonly) NSInteger age;

- (instancetype)initWithName:(NSString *)name age:(NSInteger)age;
- (NSString *)greeting;

@end

NS_ASSUME_NONNULL_END
```

```objc
// Person.m
#import "Person.h"

@implementation Person {
    NSString *_nickname;   // private ivar, not in the header
}

- (instancetype)initWithName:(NSString *)name age:(NSInteger)age {
    self = [super init];
    if (self) {
        _name = [name copy];   // direct ivar access in init
        _age = age;
    }
    return self;
}

- (NSString *)greeting {
    return [NSString stringWithFormat:@"Hi, I'm %@ (%ld years old).",
                                       self.name, (long)self.age];
}

@end
```

Things to notice:

- `NS_ASSUME_NONNULL_BEGIN` / `END` audits nullability. Inside that region, every pointer is non-null by default; mark nullable ones explicitly with `nullable`. This makes the header bridge cleanly to Swift optionals.
- `_name` and `_age` are the backing ivars the compiler synthesizes for the `@property` declarations. In `init` you assign to the ivar directly (`_name = …`) to avoid triggering the setter (which could have side effects or be overridden by a subclass).
- Outside `init`, prefer `self.name` so the setter runs (it handles `copy` correctly).

## #import vs #include

- `#import` includes a file **once**. No include guards needed. Use this for ObjC headers.
- `#include` is plain C. It includes the file every time it appears, so C headers need `#ifndef` / `#define` / `#endif` include guards (or `#pragma once`).

```objc
#import <Foundation/Foundation.h>   // system framework, angle brackets
#import "Person.h"                  // local header, double quotes
```

Angle brackets search system SDK paths; double quotes search the project first, then system paths. The convention is strict: system = `<>`, local = `""`.

## #pragma mark

`#pragma mark` adds labels to Xcode's jump bar (the dropdown above the editor). A dash adds a separator line. This is how ObjC codebases organize methods without splitting files.

```objc
@implementation Person

#pragma mark - Lifecycle

- (instancetype)initWithName:(NSString *)name age:(NSInteger)age { /* … */ }

#pragma mark - Public

- (NSString *)greeting { /* … */ }

#pragma mark - Private

- (void)didChangeNickname { /* … */ }

@end
```

In the jump bar you will see three grouped sections: *Lifecycle*, *Public*, *Private*. Use `#pragma mark -` alone (no label) for a bare separator.

## C types ObjC inherits

Objective-C is a strict superset of C. Every C type is available. Apple defines sized aliases you should use instead of the bare C names, because they are correct on both 32-bit and 64-bit:

| Use | Not | Why |
|---|---|---|
| `NSInteger` | `int` / `long` | 32 or 64 bits depending on platform. Matches pointer size. |
| `NSUInteger` | `unsigned int` | Unsigned counterpart. |
| `CGFloat` | `float` / `double` | 32-bit `float` on 32-bit devices, 64-bit `double` on 64-bit. CoreGraphics expects this. |
| `BOOL` | `bool` | Historically `signed char`; now `bool` on Darwin. Use `YES` / `NO`. |

When you format these with `NSLog` / `NSString stringWithFormat:`, cast to a known size — the `%` specifier must match:

```objc
NSInteger age = 30;
NSUInteger count = 5;
CGFloat height = 1.75;

NSLog(@"age=%ld count=%lu height=%f", (long)age, (unsigned long)count, (double)height);
```

Getting the cast wrong prints garbage or truncates on a 32-bit target. The casts are not optional in portable code.

## NSString literals vs C strings

The `@` prefix turns a C string literal into an `NSString` object at compile time. They are different types and not interchangeable.

```objc
NSString *objcName = @"Mei";   // NSString object, length, Unicode-correct
const char *cName = "Mei";     // C string, null-terminated char array

NSLog(@"%@", objcName);        // %@ prints an ObjC object's description
NSLog(@"%s",  cName);          // %s prints a C string
```

`%@` is the format specifier for any ObjC object — it calls `-description` on the object. Use it for `NSString`, `NSNumber`, `NSArray`, your own classes.

To cross between the two: `objcName.UTF8String` gives you a `const char *`; `[NSString stringWithUTF8String:cName]` goes the other way.

## nil vs Nil vs NULL

Three different nulls for three different pointer kinds:

| Null | Type | Use for |
|---|---|---|
| `nil` | `id` (object pointer) | An Objective-C object reference that points to nothing. |
| `Nil` | `Class` (class pointer) | A class reference that points to nothing. Rarely used. |
| `NULL` | `void *` (raw C pointer) | A plain C pointer (a `malloc`'d buffer, a CoreFoundation ref not bridged, a `void *` context). |

```objc
Person *p = nil;          // object pointer is null
Class c = Nil;            // class pointer is null
void *ctx = NULL;         // C pointer is null
```

The crucial behavior: **sending a message to `nil` is legal and returns a zeroed value** (`nil`, `0`, `NO`, `0.0` depending on return type). It does not crash. This is why legacy ObjC code is full of `[maybeNil doThing]` with no guard.

```objc
Person *p = nil;
NSString *name = p.name;   // name is nil — no crash, no exception
NSInteger age = p.age;     // age is 0 — no crash
```

If you need to represent "no value" inside a collection (which cannot hold `nil`), use the `NSNull` singleton:

```objc
NSArray *items = @[ @"a", [NSNull null], @"c" ];
```

## ObjC vs Swift, side by side

The same trivial operation — make a person, greet them — in both languages:

```objc
// Objective-C
Person *p = [[Person alloc] initWithName:@"Mei" age:30];
NSLog(@"%@", [p greeting]);
// Hi, I'm Mei (30 years old).
```

```swift
// Swift
let p = Person(name: "Mei", age: 30)
print(p.greeting())
// Hi, I'm Mei (30 years old).
```

| Concept | ObjC | Swift |
|---|---|---|
| Allocate + init | `[[Person alloc] initWith…:]` or `[Person personWith…:]` | `Person(…)` |
| Call a method | `[p greeting]` | `p.greeting()` |
| String format | `[NSString stringWithFormat:@"…", arg]` | `String(format: "…", arg)` |
| Print | `NSLog(@"%@", x)` | `print(x)` |
| Nullability | `nil` is a no-op receiver | `nil` is a compile-time `Optional.none` |
| Property access | `p.name` (sugar for `[p name]`) | `p.name` (direct) |

## What's next

You can now read the surface syntax. The next page goes deeper on classes: the `@interface` / `@implementation` pair, every `@property` attribute, the designated initializer pattern, and `+load` vs `+initialize`.

**Next** → [Classes and objects](./03-classes-and-objects.md)
