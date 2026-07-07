---
title: Classes and objects
tier: objective-c
platform: ios
---

# Classes and objects

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › Classes and objects

**Goal**

You will define a class with `@interface` and `@implementation`, use every common `@property` attribute correctly, write a designated initializer, and understand `+load` vs `+initialize`. After this page you can read and write a small model class end-to-end.

**Prerequisites**

- [02 Syntax foundations](./02-syntax-foundations.md)

## The two-part class definition

Every Objective-C class is declared in a header and defined in an implementation. The header is the public contract; the implementation is private.

```objc
// Person.h
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface Person : NSObject <NSCopying>

@property (nonatomic, copy, readonly) NSString *name;
@property (nonatomic, assign, readonly) NSInteger age;
@property (nonatomic, copy) NSString *nickname;

- (instancetype)initWithName:(NSString *)name age:(NSInteger)age;

@end

NS_ASSUME_NONNULL_END
```

```objc
// Person.m
#import "Person.h"

@interface Person ()
@property (nonatomic, assign, readwrite) NSInteger age;   // private readwrite
@end

@implementation Person

- (instancetype)initWithName:(NSString *)name age:(NSInteger)age {
    self = [super init];
    if (self) {
        _name = [name copy];
        _age = age;
    }
    return self;
}

@end
```

Anatomy of the interface line:

```
@interface Person : NSObject <NSCopying>
           ^         ^          ^
           class     super      adopted protocols (comma-separated)
```

- `Person` is the class name.
- `NSObject` is the superclass. Every ObjC class ultimately inherits from `NSObject` (or `NSProxy`).
- `<NSCopying>` declares that `Person` conforms to the `NSCopying` protocol. You must implement `-copyWithZone:` in the `.m`.

## Class extensions (private API)

The anonymous `@interface Person ()` block in the `.m` file is a **class extension**. It lets you redeclare properties and add methods that are visible only inside the implementation file.

The pattern above is idiomatic: declare `age` as `readonly` publicly (so callers can't change it), but redeclare it as `readwrite` privately so your own methods can mutate it. The synthesized setter is private; outside callers see no setter at all.

```objc
// In Person.m only:
@interface Person ()
@property (nonatomic, assign, readwrite) NSInteger age;
- (void)incrementAge;   // private method, not in the .h
@end
```

## @property attributes

`@property` synthesizes a getter, a setter (unless `readonly`), and a backing ivar named `_<name>`. The attributes control memory semantics, atomicity, and visibility.

### Memory attributes (under ARC)

| Attribute | Use for | Why |
|---|---|---|
| `strong` | Owning references to objects (default for objects). | Retains the value; releases the old value on reassign. Keeps the object alive. |
| `weak` | Non-owning references that should go to `nil` when the target deallocates (delegates, observers, IB outlets not held by a parent). | Does not keep the object alive; auto-zeroed at dealloc. Prevents retain cycles. |
| `copy` | Value types with mutable subclasses — `NSString`, `NSArray`, `NSDictionary`, `NSSet`. | Makes an immutable copy on assign, so a caller passing an `NSMutableString` can't mutate your stored string out from under you. |
| `assign` | Primitives (`NSInteger`, `CGFloat`, `BOOL`) and unsafe-unretained object pointers (rare). | Plain assignment, no retain. For objects use `weak` instead — `assign` on an object leaves a dangling pointer at dealloc. |

### Atomicity

| Attribute | Behavior |
|---|---|
| `nonatomic` | No locking. Fast. Not thread-safe even for a single read/write (you can still see torn values on some architectures for compound access). **Use this by default in UI code.** |
| `atomic` (default) | Synthesized getter/setter take a lock, so a single get or set is consistent. Does **not** make compound operations (read-modify-write) thread-safe. |

`atomic` is the default; `nonatomic` is the convention in app code because (a) it's faster and (b) `atomic`'s per-access locking doesn't actually buy thread safety for any real operation. If you need thread safety, use a queue or `@synchronized`, not `atomic`.

### Visibility

| Attribute | Behavior |
|---|---|
| `readwrite` (default) | Synthesizes both getter and setter. |
| `readonly` | Synthesizes only the getter. To mutate internally, redeclare as `readwrite` in a class extension. |

### Sensible combinations

```objc
// Immutable NSString held by this object:
@property (nonatomic, copy, readonly) NSString *name;

// Mutable, owned, settable NSString:
@property (nonatomic, copy) NSString *nickname;

// Primitive integer:
@property (nonatomic, assign) NSInteger count;

// Delegate — does not own the delegate, breaks cycles:
@property (nonatomic, weak) id <PersonDelegate> delegate;

// IBOutlet to a view not held by a strong parent (rare in modern iOS):
@property (nonatomic, weak) IBOutlet UIButton *dismissButton;
```

::: warning Always use copy for NSString, NSArray, NSDictionary, NSSet
If you use `strong` on an `NSString *` and a caller hands you an `NSMutableString`, they can later mutate the string you stored. `copy` defends against this by snapshotting an immutable copy on assign. The cost is negligible for the common case (the compiler elides the copy when the source is already immutable).
:::

## self and super

- `self` is a reference to the current instance. In an instance method it's an `id`; in a class method it's a `Class`.
- `super` is not a different object — it's the same instance, but method dispatch starts at the superclass. Use it to call the superclass's implementation of the method you're overriding (most importantly, `[super init]` / `[super dealloc]` pre-ARC).

```objc
- (instancetype)initWithName:(NSString *)name age:(NSInteger)age {
    self = [super init];   // call NSObject's init, assign the result back to self
    if (self) {
        _name = [name copy];
        _age = age;
    }
    return self;
}
```

The `self = [super init]` assignment is mandatory. A superclass's `init` can return a different object (class clusters, e.g. `NSString`), and if it returns `nil` you must not touch your ivars. Always check `if (self)`.

## Initializers

ObjC has no language-level `init` keyword. Initialization is just a method named `init…` that returns `instancetype` (or, in very old code, `id`).

### Designated vs convenience

- **Designated initializer** — the one that calls `[super init…]` and sets up *all* ivars the class introduces. A class has exactly one (or a small, documented set).
- **Convenience initializer** — any other `init…` method; it calls *this class's* designated initializer (`[self initWith…]`), not `super`.

```objc
// Person.h
- (instancetype)initWithName:(NSString *)name age:(NSInteger)age;   // designated

// Person.m
- (instancetype)initWithName:(NSString *)name age:(NSInteger)age {
    self = [super init];     // designated: calls super
    if (self) {
        _name = [name copy];
        _age = age;
    }
    return self;
}

- (instancetype)initWithName:(NSString *)name {
    return [self initWithName:name age:0];   // convenience: calls self's designated
}
```

Rules to keep straight:

- Designated init calls `[super designatedInit…]`.
- Convenience init calls `[self designatedInit…]`.
- Convenience inits never call `super` directly.
- If you override a superclass's designated init, you must call *your* super's designated (which is usually the same selector).

### instancetype return type

Use `instancetype` as the return type of any method that returns an instance of the class it's defined on (`init…`, factory `+` methods). The compiler infers the actual class so subclasses inherit the right type — `[Person personWithName:@"x"]` returns `Person *`, and `[Employee personWithName:@"x"]` (if `Employee` inherits and doesn't override) returns `Employee *`.

Pre-clang-3.0 code used `id`, which loses the type. Modern code uses `instancetype` everywhere it applies.

## Class methods (+) vs instance methods (-)

The leading `-` or `+` on a method signature distinguishes them:

```objc
- (NSString *)greeting;              // instance method: called on an instance
+ (Person *)personWithName:(NSString *)name;   // class method: called on the class
```

```objc
Person *p = [Person personWithName:@"Mei"];   // + method, like a static factory
NSString *g = [p greeting];                    // - method, needs an instance
```

Class methods are the ObjC equivalent of `static` methods in Swift / Java. They cannot access instance state (no `self` instance), but `self` inside a `+` method refers to the `Class` object itself — useful for subclass-aware factories.

## +load vs +initialize

Both fire automatically, once per class, with no explicit call. The differences are sharp and easy to get wrong.

| | `+ (void)load` | `+ (void)initialize` |
|---|---|---|
| When | When the class is added to the runtime — very early, before `main()` for statically-linked classes. | Lazily, the first time the class receives a message (before the first instance method or class method is invoked). |
| Thread safety | Called by the runtime on the main thread, serialized. | Called by the runtime in a thread-safe manner on the thread that triggered it. |
| Subclass behavior | Called once per class; subclasses' `+load` is called *after* the superclass's. | If a subclass does not implement `+initialize`, the superclass's `+initialize` is called *again* when the subclass is first messaged. |
| Use for | Method swizzling registration that must happen before any code runs. | One-time lazy setup that's safe to defer (caches, default values). |
| Don't | Don't do heavy work — it stalls app launch. | Don't rely on it for correctness if subclasses might inherit it; guard with `if (self == [ClassName class])`. |

```objc
@implementation Person

+ (void)load {
    NSLog(@"Person class loaded into the runtime");
}

+ (void)initialize {
    if (self == [Person class]) {
        NSLog(@"Person receiving its first message — set up caches here");
    }
}

@end
```

The `if (self == [Person class])` guard prevents the setup from running twice when a subclass doesn't override `+initialize` — without it, registering an `Employee : Person` would run `Person`'s setup block again when `Employee` is first messaged.

## Complete example

Putting it all together. A `Person` class with a designated init, a convenience init, a class factory, an overridden `description`, and a `main` that exercises it.

```objc
// Person.h
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface Person : NSObject

@property (nonatomic, copy, readonly) NSString *name;
@property (nonatomic, assign, readonly) NSInteger age;

- (instancetype)initWithName:(NSString *)name age:(NSInteger)age;   // designated
- (instancetype)initWithName:(NSString *)name;                       // convenience
+ (Person *)personWithName:(NSString *)name age:(NSInteger)age;     // factory

@end

NS_ASSUME_NONNULL_END
```

```objc
// Person.m
#import "Person.h"

@implementation Person

#pragma mark - Lifecycle

- (instancetype)initWithName:(NSString *)name age:(NSInteger)age {
    self = [super init];
    if (self) {
        _name = [name copy];
        _age = age;
    }
    return self;
}

- (instancetype)initWithName:(NSString *)name {
    return [self initWithName:name age:0];
}

+ (Person *)personWithName:(NSString *)name age:(NSInteger)age {
    return [[self alloc] initWithName:name age:age];   // self == the Class; subclass-aware
}

#pragma mark - NSObject

- (NSString *)description {
    return [NSString stringWithFormat:@"<Person %@ age=%ld>", self.name, (long)self.age];
}

@end
```

```objc
// main.m
#import <Foundation/Foundation.h>
#import "Person.h"

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        Person *p1 = [[Person alloc] initWithName:@"Mei" age:30];
        Person *p2 = [Person personWithName:@"Aarav" age:25];   // factory
        Person *p3 = [[Person alloc] initWithName:@"Sam"];      // convenience, age=0

        NSLog(@"%@", p1);   // <Person Mei age=30>
        NSLog(@"%@", p2);   // <Person Aarav age=25>
        NSLog(@"%@", p3);   // <Person Sam age=0>
    }
    return 0;
}
```

Note `[self alloc]` in the factory — `self` in a `+` method is the `Class`. If `Employee` inherits from `Person` and doesn't override `+personWithName:age:`, calling `[Employee personWithName:@"x" age:1]` returns an `Employee *`, not a `Person *`. That's the subclass-aware factory pattern, and it's why you write `[self alloc]` instead of `[Person alloc]`.

## What's next

You can now define a class. The next page covers the thing that makes ObjC classes actually work at runtime without a garbage collector: reference counting, ARC, retain cycles, and toll-free bridging to CoreFoundation.

**Next** → [Memory management](./04-memory-management.md)
