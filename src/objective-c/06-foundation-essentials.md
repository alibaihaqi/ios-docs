---
title: Foundation essentials
tier: objective-c
platform: ios
---

# Foundation essentials

[Hub](https://alibaihaqi.github.io/learning-docs/) › iOS › Objective-C › Foundation essentials

**Goal**

You will use the core Foundation value types — `NSString`, `NSArray`, `NSDictionary`, `NSNumber`, `NSValue`, `NSNull` — fluently, understand the **class cluster** pattern that hides private subclasses behind a public abstract class, and see how these types bridge to Swift. After this page you can read and write collection-manipulating ObjC without surprise.

**Prerequisites**

- [05 Categories and protocols](./05-categories-and-protocols.md)

## NSString

`NSString` is the Objective-C string. It is immutable and UTF-based. The `@""` literal is the commonest constructor.

```objc
NSString *literal = @"hello";
NSString *formatted = [NSString stringWithFormat:@"user-%d-logged-in", 42];
NSString *fromC = [NSString stringWithUTF8String:"raw bytes"];
NSString *upper = [literal uppercaseString];            // HELLO
NSUInteger len = [literal length];                       // 5 (number of UTF-16 code units)
unichar c = [literal characterAtIndex:0];                // 'h'
```

### Format specifiers

`stringWithFormat:` (and `NSLog`, and `-[NSString initWithFormat:]`) use `printf`-style specifiers, with `%@` being the ObjC-specific addition:

| Specifier | For | Notes |
|---|---|---|
| `%@` | Any Objective-C object | Calls `-description` on the object. **The one you'll use most.** |
| `%d` / `%i` | `int`, `BOOL` as integer | |
| `%u` | `unsigned int` | |
| `%ld` | `long` / `NSInteger` | Cast the value: `NSLog(@"%ld", (long)nsIntValue)`. |
| `%lu` | `unsigned long` / `NSUInteger` | Cast to `(unsigned long)`. |
| `%f` | `double`, `CGFloat` | `%.2f` for two decimals. |
| `%x` | Hex | `%p` for a pointer address. |
| `%C` | `unichar` | Used in page 05's `reverseString`. |
| `%%` | A literal `%` | |

::: warning Always cast NSInteger / NSUInteger for %ld / %lu
`NSInteger` and `NSUInteger` are architecture-dependent typedefs (`long` on 64-bit, `int` on 32-bit). Format them as `%ld`/`%lu` and cast to `(long)`/`(unsigned long)` so the size matches the specifier on every architecture — otherwise you get garbage or a crash on 32-bit.
:::

### Comparison and search

```objc
NSString *a = @"Hello";
NSString *b = @"hello";

BOOL same = [a isEqualToString:b];                       // NO (case-sensitive)
NSComparisonResult order = [a compare:b];                // NSOrderedAscending
BOOL match = ([a compare:b options:NSCaseInsensitiveSearch] == NSOrderedSame);  // YES

BOOL has = [a hasPrefix:@"Hel"];                          // YES
BOOL suffix = [a hasSuffix:@"llo"];                       // YES
NSRange r = [a rangeOfString:@"ll"];                      // {location=2, length=2}
if (r.location == NSNotFound) { /* not present */ }
```

- `isEqualToString:` is the right equality check — `==` on strings compares pointer identity, which works for literals but fails for separately-constructed equal strings.
- `compare:` returns `NSOrderedAscending`, `NSOrderedSame`, or `NSOrderedDescending`.
- `rangeOfString:` returns an `NSRange` struct; `location == NSNotFound` means "not found."

### NSMutableString

`NSString` is immutable — "mutating" methods return a new string. When you need in-place edits (building a string incrementally in a loop), use `NSMutableString`:

```objc
NSMutableString *builder = [NSMutableString string];
for (int i = 0; i < 3; i++) {
    [builder appendFormat:@"line %d\n", i];
}
// "line 0\nline 1\nline 2\n"
```

::: tip Why not just stringByAppendingString: in a loop?
Each `stringByAppendingString:` call allocates a brand-new immutable string and copies the old contents into it — O(n) per append, O(n²) for the whole loop. `NSMutableString` amortizes that. The same logic applies to `NSArray`/`NSMutableArray` below.
:::

## NSArray / NSMutableArray

`NSArray` is an ordered, immutable collection of object pointers. It cannot contain `nil` (use `NSNull` — see below) or primitives (box them in `NSNumber`/`NSValue`).

```objc
NSArray *names = @[@"Mei", @"Aarav", @"Sam"];      // literal
NSArray *empty = @[];
NSArray *one = [NSArray arrayWithObject:@"x"];
NSArray *multi = [NSArray arrayWithObjects:@"a", @"b", @"c", nil];  // nil-terminated, legacy

NSUInteger count = [names count];                   // 3
NSString *first = names[0];                         // subscripting (modern)
NSString *firstOld = [names objectAtIndex:0];       // same thing, older syntax
NSString *last = [names lastObject];
BOOL has = [names containsObject:@"Mei"];            // YES (uses isEqual:)
NSUInteger idx = [names indexOfObject:@"Sam"];      // 2, NSNotFound if absent
```

### Fast enumeration

The idiomatic loop — compiled down to a fast enumeration primitive:

```objc
for (NSString *name in names) {
    NSLog(@"%@", name);
}
```

You may not mutate the array during fast enumeration (it raises an exception). Filter to a separate collection first.

### Block-based enumeration

When you need the index, or want to stop early, use `enumerateObjectsUsingBlock:`:

```objc
[names enumerateObjectsUsingBlock:^(NSString *name, NSUInteger idx, BOOL *stop) {
    NSLog(@"%lu: %@", (unsigned long)idx, name);
    if ([name isEqualToString:@"Aarav"]) {
        *stop = YES;    // halt enumeration
    }
}];
```

The block signature is fixed by the API: `^(id obj, NSUInteger idx, BOOL *stop)`. Set `*stop = YES` to break. The block runs synchronously on the calling thread.

### NSMutableArray

```objc
NSMutableArray *list = [NSMutableArray array];
[list addObject:@"first"];
[list addObject:@"second"];
[list insertObject:@"between" atIndex:1];     // [first, between, second]
[list removeObjectAtIndex:0];                  // [between, second]
[list removeAllObjects];
```

## NSDictionary / NSMutableDictionary

`NSDictionary` is an immutable hash map from key to value. Keys must conform to `NSCopying` (they're copied on insert — `NSString` is the common key type) and to `isEqual:`/`hash`.

```objc
NSDictionary *capitals = @{
    @"Japan": @"Tokyo",
    @"Indonesia": @"Jakarta",
    @"India": @"New Delhi"
};

NSString *cap = capitals[@"Japan"];                  // subscripting (modern)
NSString *capOld = [capitals objectForKey:@"Japan"]; // same thing, older syntax
NSArray *allKeys = [capitals allKeys];
NSArray *allValues = [capitals allValues];
NSUInteger n = [capitals count];                     // 3
```

### Fast enumeration over keys

```objc
for (NSString *country in capitals) {
    NSString *city = capitals[country];
    NSLog(@"%@ → %@", country, city);
}
```

### NSMutableDictionary

```objc
NSMutableDictionary *m = [NSMutableDictionary dictionary];
m[@"Japan"] = @"Tokyo";                       // set via subscripting
[m setObject:@"Jakarta" forKey:@"Indonesia"];  // equivalent setter
[m removeObjectForKey:@"Japan"];
m[@"Japan"] = nil;                            // also removes the key
```

Setting `dict[key] = nil` removes the entry (unlike `NSNull`, which inserts a real object — see below).

## NSNumber

`NSNumber` boxes a C primitive into an object so it can live in an `NSArray`/`NSDictionary`. The compiler literal syntax is the modern, preferred form:

```objc
NSNumber *i = @42;                  // integer
NSNumber *d = @3.14;                // double
NSNumber *b = @YES;                 // BOOL
NSNumber *c = @'A';                 // char

NSNumber *legacy = [NSNumber numberWithInt:42];
NSNumber *fromVar = @(someNSInteger);   // box a variable: @(expr)

NSArray *mixed = @[@1, @2.5, @NO, @"text"];   // objects only — primitives must be boxed
NSInteger raw = [i integerValue];             // unbox
```

- `@(expr)` boxes any scalar expression — essential for `NSInteger`/`NSUInteger` variables where `@varName` is not valid syntax.
- Unboxing is type-specific: `integerValue`, `doubleValue`, `boolValue`, `floatValue`, `unsignedIntegerValue`. `NSNumber` remembers what you put in; the unboxer coerces.

## NSValue

`NSValue` boxes non-object C types — structs (`CGRect`, `CGPoint`, `NSRange`), raw pointers, and anything `NSNumber` can't hold. It is how you store a `CGRect` in a collection:

```objc
CGRect frame = CGRectMake(0, 0, 100, 50);
NSValue *boxed = [NSValue valueWithCGRect:frame];

NSMutableArray *frames = [NSMutableArray array];
[frames addObject:boxed];

CGRect restored = [boxed CGRectValue];
```

Foundation also offers `valueWithPoint:`, `valueWithRange:`, `valueWithBytes:objCType:` (for arbitrary structs) and corresponding getters.

## NSNull

Collections cannot contain `nil` — `nil` means "no object" and is the sentinel that terminates `arrayWithObjects:`. To represent an explicit null inside an array or dictionary, use the `NSNull` singleton:

```objc
NSArray *jsonLike = @[
    @"Mei",
    [NSNull null],          // a "null" entry, not the absence of one
    @30
];

NSDictionary *response = @{
    @"name": @"Aarav",
    @"nickname": [NSNull null]    // key present, value is null
};

id maybe = response[@"nickname"];
if (maybe == [NSNull null]) {
    NSLog(@"explicitly null, not missing");
}
```

`[NSNull null]` is a singleton, so identity comparison (`==` or `===`) is the correct check.

| Sentinel | Meaning |
|---|---|
| `nil` | No object at all. Cannot appear inside `NSArray`/`NSDictionary`. Terminates `nil`-terminated variadic constructors. |
| `[NSNull null]` | A real object representing "null." Lives in collections. Compare with `==`. |
| `NSNotFound` | An `NSInteger` sentinel returned by search methods (`indexOfObject:`, `rangeOfString:`) meaning "not found." |

## The class cluster pattern

`NSArray`, `NSDictionary`, `NSString`, `NSNumber` — all the Foundation value types — are **class clusters**. The public class (`NSArray`) is an abstract superclass. When you call `[NSArray array]` or write `@[]`, the framework returns an instance of a *private subclass* picked for the situation:

```
NSArray                          ← the public type you see and type against
  ├── __NSArrayI                 ← immutable storage (what @[] returns)
  ├── __NSArrayM                 ← NSMutableArray storage
  ├── __NSArrayReversed          ← -reverseObjectEnumerator's backing
  └── __NSSingleObjectArrayI     ← special-cased single-element array
```

You never instantiate these subclasses directly and you never name them in code. You program to the abstract public class; the cluster picks the concrete subclass.

### Why this matters in practice

- **Type `NSArray *`, not the subclass.** Never write `__NSArrayI *` — that's a private type that can change between OS releases.
- **`[NSArray alloc]` may return a placeholder, not a real instance.** The cluster sometimes hands back a special placeholder object from `+alloc` and only produces the real subclass when you call an `init…` method. This is why `[[NSArray alloc] init]` and `[NSArray array]` are both fine, but you should not assume `+alloc` alone gives you a usable object.
- **Subclassing a cluster is hard.** A class cluster has a small set of **primitive methods** (e.g. for `NSArray`: `count` and `objectAtIndex:`) that a subclass must implement; everything else (`firstObject`, `containsObject:`, `enumerateObjectsUsingBlock:`…) is built on those primitives. If you genuinely need a custom array-like class, you implement the primitives and inherit the rest. In practice, prefer composition over subclassing a cluster.
- **`isKindOfClass:` on a cluster can surprise you.** `[arr isKindOfClass:[NSMutableArray class]]` is the way to check mutability — but beware that Foundation sometimes bridges across cluster internals, so prefer designing around the abstract type.

## Mutability pattern: immutable base + mutable subclass

Every Foundation value type follows the same design: an immutable base class (`NSArray`, `NSString`, `NSDictionary`, `NSSet`) and a mutable subclass (`NSMutableArray`, `NSMutableString`, `NSMutableDictionary`, `NSMutableSet`).

```objc
// Start immutable, copy when you need to mutate:
NSArray *snapshot = @[...];
NSMutableArray *working = [snapshot mutableCopy];   // a new, independent mutable copy
[working addObject:@"new"];
NSArray *frozen = [working copy];                    // an immutable snapshot again
```

- `copy` on a mutable instance returns an immutable copy.
- `mutableCopy` on an immutable instance returns a mutable copy.
- Both always return a *new* object — the original is untouched. This is why `@property (copy)` is safe and cheap: it snapshots the incoming value.

This is also why a method that takes `NSArray *` is asserting "I will not mutate this" — even if you pass an `NSMutableArray`, the receiver treats it as immutable. (It *could* still mutate it, since it's the same object; the type is a promise, not an enforcement. Defensive `copy` on the property breaks that aliasing.)

## Toll-free bridging to Swift

On Apple platforms, the Foundation types are bridged to Swift value types:

| Objective-C | Swift | Notes |
|---|---|---|
| `NSString` | `String` | Bridged; `String` is value-type, `NSString` is reference-type. |
| `NSArray` | `[Any]` / `Array<Any>` | Element type must be bridgeable. |
| `NSDictionary` | `[AnyHashable: Any]` | Keys must be `Hashable`/`NSCopying`. |
| `NSSet` | `Set<AnyHashable>` | |
| `NSNumber` | `NSNumber` (bridged to native types when typed) | `@42` ↔ Swift `Int` when the type is known. |

When an ObjC API declares `NSArray<NSString *> *`, Swift sees it as `[String]` — the lightweight generics (`<NSString *>`) carry the element type across the bridge. A bare `NSArray *` becomes `[Any]`, forcing casts on the Swift side. **Always annotate collection element types** in public ObjC headers for a clean Swift interface.

## A practical example: parsing a JSON-like dictionary

Combining the above — walking a nested structure you'd get from `NSJSONSerialization`:

```objc
NSDictionary *response = @{
    @"user": @{
        @"name": @"Mei",
        @"age": @30,
        @"verified": @YES,
        @"nickname": [NSNull null]
    },
    @"tags": @[@"swift", @"objc", @7]
};

NSDictionary *user = response[@"user"];
NSString *name = user[@"name"];                  // @"Mei"
NSNumber *age = user[@"age"];                    // @30
BOOL verified = [user[@"verified"] boolValue];   // YES

// Safe optional access — every subscript can yield nil/NSNull.
id nickname = user[@"nickname"];
if (nickname && nickname != [NSNull null]) {
    NSLog(@"nickname: %@", nickname);
}

NSArray *tags = response[@"tags"];
for (id tag in tags) {
    if ([tag isKindOfClass:[NSString class]]) {
        NSLog(@"tag: %@", tag);
    } else if ([tag isKindOfClass:[NSNumber class]]) {
        NSLog(@"numeric tag: %ld", (long)[tag integerValue]);
    }
}
```

This is the shape of almost every JSON-handling method in legacy ObjC: defensive subscripting, null checks against `[NSNull null]`, and `isKindOfClass:` before unboxing. Modern Swift's `Codable` makes this dramatically safer, but you will read this pattern constantly in pre-Swift codebases.

## What's next

You can now manipulate Foundation values. The next page covers **blocks** — Objective-C's closure syntax — which you need for collection enumeration, GCD, completion handlers, and almost every asynchronous API in the SDK.

**Next** → [Blocks](./07-blocks.md)
