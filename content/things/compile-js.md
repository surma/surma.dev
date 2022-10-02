---

title: "I turned JS into a compiled language (for fun and Wasm)"
date: "2022-10-03"
socialmediaimage: "social.jpeg"
live: false

---

This is one of those times where I got so fascinated by the idea of a thing
that I forgot to ask myself whether it’s a good idea to build the thing. The
idea being, transpiling JavaScript to C++ so I can compile _that_ to whatever
I need.

<figure>
  <video width="720" height="390" src="./goldblum.webm" type="video/webm" autoplay muted loop></video>
  <figcaption>Obligatory Jeff Goldblum.</figcaption>
</figure>

I have arrived at the conclusion that I don’t think _this specific approach_ is
worth exploring further. This made it hard to write a blog post because I took
so many shortcuts and introduced so many flaws, that I won't be able to tell
a consistent or coherent story. At the same time, I think it's better to have
an half-assed blog post where I can explain my thought process and share my
lessons learned than have no blog post at all. So here we go.

The proof-of-concept implementation, and by extension this blog post, follow
the principles of [evolutionary design]. I took many, many shortcuts and left
many parts of this system incomplete as I prioritized making it over the finish
line. I hope despite all of that, that there's still some interesting bits in
here for you.

## The Spark

While the end result of my exploration is not specific to WebAssembly (in fact,
it arguably works better without getting WebAssembly involved), the original
motivation was very much this: Running JavaScript in WebAssembly.

At work, I have been wrapping my head around [Shopify Functions]. I don’t
want to get too much into the business pitch, but Shopify Functions boil
down to Shopify running _your_ code on _their_ servers, tightly integrated
with the rest of their business logic. This allows developers to deeply
customize Shopify, even in performance-critical sections of the pipeline.
In ecommerce, both security and performance are paramount, so WebAssembly -
bringing predictable performance and a strong sandbox - makes sense as the
fundamental piece of technology. A third-party developer can inject
arbitrary code written in theoretically any language, while Shopify can remain
in control over how these code fragments are allowed to affect the rest of the
system. Shopify accepts any [WASI]-compatible Wasm module with a maximum module
size of 250KB.

At the time of writing, all WebAssembly extension points Shopify offers to
have a “JSON in, JSON out” architecture. Being a web developer, I was craving
to write my Shopify Functions in JavaScript — but alas, JavaScript does not
compile to WebAssembly. _Or does it?_

## JS in Wasm the easy way 

To run JavaScript in Wasm, one solution is to compile a JS _engine_ to Wasm,
and have it parse and execute your JS code. Engines like V8 or SpiderMonkey are
massive and won't easily compile to Wasm, not to mention the fact that JIT'ing
as a concept is not possible in Wasm right now. Although that hasn't stopped
the [ByteCodeAlliance from compiling Spidermonkey to WebAssembly][spiderwasm].

> **JIT’ing**: WebAssembly is designed to store the instructions immutably and
separatly from the memory that the instructions work on. That means that, at
least as of now, a Wasm module cannot generate instructions and subsequently
execute them.

JS interpreters and VMs are more viable to bring to WebAssembly, though. The
Shopify Functions team created [javy], a toolchain that compiles a JS VM to
Wasm and embeds your JS in the Wasm module. The engine that javy relies on is
[QuickJS], a small JavaScript VM that is fully ES2015 compliant. It was written
by Fabrice Bellard, who also created qemu, ffmpeg and tcc. The problem is that
the resulting Wasm module is over 250KB. To work around that, I tried removing
the JS parser and only compile QuickJS's byte code VM.  Alas, no cigar. Even
removing unused globals (like `ArrayBuffer` or `Symbol`) did not get me under
the limit.

The Shopify Functions team is looking into blessing a way to write functions in
JavaScript. In the meantime, I’ll be spending the rest of the blog post looking
into a less serious solution.

## C++

One language that compiles really well to Wasm is C++. Most of the early days
of Wasm toolchains were focused on making C++ code run on the web, as C++
is often at the foundation of many big software projects. LLVM’s `clang++`
now supports Wasm out of the box, and [WASI-SDK] provides a sysroot (libc,
libc+ + etc) that works against WASI rather than, say, POSIX. This allows
you to compile C/ C++ code to WebAssembly, and run it in any WASI-compatible
environment (like [wasmtime]).

Now here finally comes my rather amateurish observation that led to this
blog post: I think JavaScript looks a lot like C++. In fact, most of the
features that JavaScript has to offer, C++20 has to offer as well. Often with
extremely similar syntax. **What if I could write a transpiler of sorts that
translates JavaScript to C++** and aims to maintain the semantics and behavior
of JavaScript? Can I write a really dumb transpiler that defers all the difficult
stuff like type checking and scoping to the C++ compiler? Would that yield
smaller binaries? Maybe even faster ones? Well, only one way to find out.

### The North Star

As a north star for how capable I wanted my toy transpiler to be, I wrote an
admittedly convoluted JS program similar to the one below.
 
```js
function* numbers() {
  let i = 0;
  const f = () => i++;
  yield* [f(),f(),f()].map(i => i + 1);
}

const arr = [];
for(let x of numbers()) {
  arr.push(x);
}
IO.write_to_stdout(arr.join(","));
```

The program is nonsense, of course, but it covers a good range of features that
I want to support: Variables, Functions, Output, Loops, Iterators, Generators,
Closures, Methods, ...  and the output is deterministic and well-defined as
well: `1,2,3`.

## The Proof-of-Concept

Let me get the PoC out the way. I have called this exploration [jsxx] and
you can find all the [source code][jsxx] on my GitHub. Be warned, though: This
is the first time I'm using C++20. I used to write C++ many years ago, at a time
where C++11 was considered bleeding edge. I did a lot of C when I was working
on microprocessors, and it still shows. Nowadays I mostly write JavaScript
and Rust. I used this as an opportunity to catch up on C++ and get a bit more
familiar with all the new stuff that C++20 has to offer. When I asked them, [Sy
Brand] recommended [Josh Lospinoso]'s book "C++ Crash Course", which I have
read, enjoyed and can now only recommend myself. And supporting No Starch Press
is an added benefit.

<figure>
	<picture>
		<img  width=477 height=630 src="./cppcrash.jpeg" alt="The cover of the book showing a winged robot with a jet pack.">
	</picture>
	<figcaption>"C++ Crash Course" by Josh Lospinoso, Starch Press 2019</figcaption>
</figure>

That all being said, I'm sure my C++ is horrible, so please don't look at it
too closely.

### Using JSXX

The UI of the transpiler is also very basic. For example, using the north star
program from above, you can run `jsxx` to compile JS to C++ and immediately
invoke `clang++` to turn it into a native binary.

```
$ cat testprog.js | cargo run
$ ./output
1.000000,2.000000,3.000000
```

To compile to WebAssembly, use the `--wasm` flag and provide the path to 
WASI-SDK's `clang++` (and additional compiler flags, if desired):

```
$ cat testprog.js | \
    cargo run -- \ 
    --wasm \
    --clang-path $HOME/Downloads/wasi-sdk-16.0/bin/clang++ \
    -- -Oz -flto -Wl,--lto-O3
$ wasmtime output.wasm
1.000000,2.000000,3.000000
$ ls -alh output.wasm
-rwxr-xr-x  1 surma  staff    86K Sep 29 19:05 output.wasm
$ cat output.wasm | brotli -q 11 -c | wc -c
   29972
```

So I managed to run some fairly complex JavaScript in Wasm without writing a
whole engine, and ended up with a mere 86KiB. That's pretty cool.

> **ES20-ohmygodwhathaveyoudone:** Please don't get too excited. This
transpiler supports a miniscule subset of JavaScript and is in no way compliant
to any ECMAScript standard. It _could_ be, but as of now it's not.

If you want to inspect the generated C++ code, pass the `--emit-cpp` flag.

Anyhow, I don't think this particular approach is worth pursuing any further.
To explain why I think that, I suppose I should explain how this approach
works.

## JSXX

Let's start with the most normal part of this setup. The parser.

### Parsing

I didn’t want write my own parser. That’s not where the interesting parts of
this project were going to happen. Since I wanted to write this transpiler in
Rust (move over, OCaml), I decided to just rip out the parser and the AST from
[swc], which would allow me to parse even the most recent ES2022 syntax. My
goal was to exploit the similarities between JS and C++ to keep the transpiler
extremely simple. All it would do is traverse the JS AST and emit corresponding
C++ code in a single pass, without tracking variable scopes, types or any of
that complicated compiler-y stuff. Most of the meat would be in the runtime
I was going to write. The guiding principle here is: It doesn’t need to be
pretty, it just needs to compile.

### Variables

A variable in JS can contain any of the primitive value types: `bool`,
`number`, `string`, `Function`, `Object` or `Array` (I suppose, an `Array` is
just a special `Object`, but I think modeling them separately actually makes
the implementation easier). There are technically more primitive types like
`Symbol` or `BigInt`, but I wasn't gonna implement those.

At a syntactic level, this is easy to translate to C++, especially since C++
introduced the `auto` keyword for variable declarations.  However, a variable
has to have a single type, where as a variable in JS can change its type as
often as it likes. Assigning a number and then a string to the same variable
is common in JS, but problematic for C++’s type system. I needed to introduce
a type that can hold any JS value. This type turned into the class `JSValue`.
Before we look at the inside of the class, having the name is enough to
transpile a variable declaration.

```js
let x = 4;
x = "hello";
```
... can be transpiled to C++ as ...

```cpp
auto x = JSValue{4};
x = JSValue{"hello"};
```

If I was writing C and wanted a variable to contain one of many types, I'd
use a `union`, which are notoriously not type safe. C++ has a type-safe
counterpart to C's `union`, which is called `std::variant`:

```cpp
#include <variant>

class JSValue {
    using Box = std::variant<JSBool,
                             JSNumber,
                             JSString,
                             JSFunction,
                             JSArray,
                             JSObject>;
    // ...
    Box box;
}
```

Using `jsValue.box.index()` we can query what the type of the underlying value
is. With `std::get<JSBool>(jsValue.box)` we can get access to the underlying
value. If we call `std::get` with the wrong type the call will
throw an exception.

### Primitive types

Most of the primtive types in JS have a direct counterpart in C++. A number
in JS maps to a C++ `double`, a JS `string` to a C++ `std::string` (let’s
ignore details of WTF16 vs whatever string encoding is in C++), etc. However,
I decided to wrap each C++ primitive in a custom class because I knew I’d have
to add methods like `.toString()` to them sooner or later, and that requires
a class.

> **IEEE-754:** The ECMAScript spec demands that all `number`s be a [IEEE-754]
double-precision floating-point number (i.e. a C++ `double`). However, many
engines have an optimization to use integers under the hood if the code path
does not use fraction parts. This is only allowed if the difference is not to
the developer (apart from execution time).

> **std::string**: C++'s `std::string` has no specified encoding scheme. It is
just a series of bytes. How,... interesting.

`JSArray` is simply a vector of `JSValue`s:

```cpp
class JSArray {
    // ...
    std::vector<JSValue> internal;
}
```

`JSObject` is implemented as a list of key-value pairs. While a hash map would
also have been feasible (and potentially faster), JS actually specifies that
the order in which properties are added on an object must be preserved and
replicated when iterating over them. Also, I got stuck trying to make my
`JSValue` work as a key with `std::map`.

```cpp
class JSObject {
    // ...
    std::vector<std::pair<JSValue, JSValue>> internal;
}
```

Next, we can make use of C++’s glorious ability to overload any and all
operators, allowing us to specify _exactly_ what happens when you assign one
`JSValue` to another. Because, as you may [remember][call by reference], some
types in JS exhibit different behaviors here than others.

### References vs Values

Some of JS’s primitive types are passed around as references while some others
are values. Specifically, `bool`, `number` and `string` are values, meaning
they are _always_ copied when assigned to another variable or passed as a
function argument. Other primitives are references, meaning two variables can
reference the same underlying object.

To mimmick this behavior in C++, I have to start allocating objects and arrays
on the heap so that their lifetime is tied to the creating function. Once
you start allocating stuff on the heap, you also have to worry about freeing
that memory back up. Instead of adding a full-blown garbage collector (one
motivation for this whole thing was about keeping the size small, after all),
I decided to use `std::shared_ptr`, which is a wrapper for a pointer with a
reference counter. When that reference counter reaches zero, the heap memory
will be freed. This will handle most scenarios correctly, although cyclical
data structures will never get freed and just leak memory. Oh well.

|||codediff|cpp
  class JSValue {
    using Box = std::variant<JSBool,
                             JSNumber,
                             JSString,
                             JSFunction,
-                            JSArray,
-                            JSObject>;
+                            std::shared_ptr<JSArray>,
+                            std::shared_ptr<JSObject>>;
    // ...
    Box box;
  }
|||

With this in place, the default assignment operator does the right thing (for
now): Booleans, numbers and strings will be _copied_, arrays and objects on
the other hand will copy the reference, meaning both variables will work on the
same underlying value after the assignment.

### Operators and coercion

I want to keep the transpiler simple, meaning I don't want to have to track
which variable has what type. As a result, transpiling an expression like `a + b`
cannot rely on the types of `a` or `b`. Instead, I chose to overload all the
operators on `JSValue` and do the introspection at runtime. This is fairly
boring code. It checks the type on the left-hand side (LHS) and the right- hand
side (RHS) and then takes the appropriate action. As an example, here is what
the `+` operator looks like:

```cpp
class JSValue {
  JSValue JSValue::operator+(JSValue other) {
    if (this->type() == JSValueType::NUMBER) {
      return JSValue{std::get<JSValueType::NUMBER>(this->box).internal +
                     other.coerce_to_double()};
    }
    if (this->type() == JSValueType::STRING) {
      return JSValue{std::get<JSValueType::STRING>(this->box).internal +
                     other.coerce_to_string()};
    }
    return JSValue{"Addition not implemented for this type yet"};
  }
}
```

If the LHS is a number, I grab the underlying `double` from the Box, and
coerce the RHS to double. I can then add two doubles, just like ~~God~~ 
C++ intended and turn it back into a `JSValue`. Same procedure for strings.
Then I got tired of writing code like this. If you try using `jsxx` right now,
it will let you add variables, but will genuinely throw if you try and 
subtract variables. Don't even think about division.

`coerce_to_double()` and friends are yet again chains of `if`-`else` statements
that contain the logic for JavaScript's coercion, like turning `true` into
`1.0` etc.

### Arrays

Arrays were surprisingly simple. I only needed give `JSValue` a special
constructor (i.e. static method) and have the transpiler generate code to call 
it whenever I encounter a JavaScript array literal:

```js
let x = [1, 2, 3]
```
... transpiles to ...

```cpp
auto x = JSValue::new_array({JSValue{1}, JSValue{2}, JSValue{3}});
```

Not anywhere near as terse, but the C++ code is supposed to be compiled, not
read.

### Objects

Similar treatment for objects: I added a special constructor to `JSValue`, and
a bit of logic in the transpiler to handle all the special kinds of property
notations (key-value, shorthand, getters, setters, methods...)


```js
let x = {
  a: 1,
  b: "hello"
};`
```
... transpiles to ...

```cpp
auto x = JSValue::new_object({
  {JSValue{"a"}, JSValue{1}},
  {JSValie{"b"}, JSValue{"hello"}},
});
```

I mention methods, but I haven't really talked about closures at all.

### Functions and closures

To pass functions around as values in C++, you have to use `std::function` as
the type. As all functions on JS are effectively closures, I decided to use
C+ +'s closures as well. Their syntax is a bit weird if you don't
know it, so let me quickly catch you up. Here's a closure in C++:

```cpp
auto my_closure = [=](JSValue parameterA, JSValue parameterB) mutable -> JSValue {
 // ...
}
```

In parenthesis we have the parameters of the closure. The arrow `->` defines
the return type of the closure. The `mutable` keyword is necessary in our
context as C++ closure capture variables as `const` by default, meaning they
can't be modified. In JS closures can capture _and modify_ variables from
outside the function scope, so `mutable` it is. Inside the brackets `[]` you
can define which variables this closures captures and how. Why does C++ 
split the capture style across two places of a closure definition? I don't
know, but you can define a different capture style for each variable if you
want. For example, `[a, &b, &c, d]` captures `a` and `d` as a copy, while it
captures `b` and `c` as references.

If I wanted to list each captured variable, I'd have to implement an
understanding of lexical scopes in my transpiler. Again, way too much
complexity. Luckily, C++ also allows me to define a default capture type, that
is applied to all variables that are not explicitly listed. `[&]` sets the
default capture to be a reference, while `[=]` sets the default capture style
to copy.

Capturing by reference is not really an option, as it would once again tie
the lifetime of the reference to the creating function. Capturing a copy
isn't really a solution either because I'd get, well, a copy. The solution
is as simple as it is ugly: I wrapped the underlying `box` of any `JSValue`
in yet another `shared_ptr`. This means copying a `JSValue` will result in a
second `JSValue` with a reference to the same box. To _actually_ copy a value
(as is expected for `bool` or `number` or `string`), I added a method to
`JSValue` called `.boxed_value()`. The transpiler adds this method to any
variable access that is supposed to work on the _value_ rather than the _value
binding_.

|||codediff|cpp
  class JSValue {
    using Box = std::variant<JSBool, JSNumber, JSString, JSFunction,
                          std::shared_ptr<JSArray>,
                          std::shared_ptr<JSObject>>;
    // ...
-   Box box;
+   shared_ptr<Box> box;
  }
|||

It's worth to quickly mention another two things when talking about closures:
Firstly, every closure in JS has a `this` value (even arrow functions! They
just inherit the  surrounding `this` value). Secondly, in JS a function can
take a variable number of arguments. In C++, a function has a fixed number
of arguments (well, you _can_ have variadic functions in C++, but they
are [weird][variadic cpp]). For this reason, I decided to transpile all
closures to C++ closures with exactly 2 parameter:  a `JSValue thisArg` and a
`std::vector<JSValue>& args`.

### Properties

I'll admit: I did not want to implement support for the full prototype
chain mechanism. At the same time, I did need ways to define methods, getters
and other properties on all basic types, so that the logic for things
like `myArray.length` had a place to live. I decided to give each primtive
type class (`JSBool`, `JSNumber`, etc) a shared base class called `JSBase`
that offers exactly that: A list of key-value mappings that I interpret as
properties. The constructor of each primitive type class puts the expected
functions and getters/setters into their inherited property map. Here's what
`JSArray`'s constructor looks like as example:

```cpp
JSValue JSArray::push_impl(JSValue thisArg, std::vector<JSValue> &args) {
  auto arr = std::get<JSValueType::ARRAY>(thisArg->boxed_value());
  for (auto v : args) {
    arr->internal->push_back(v);
  }
  return JSValue::undefined();
}

// ...

std::vector<std::pair<JSValue, JSValue>> JSArray_prototype{
    {JSValue{"push"}, JSValue::new_function(&JSArray::push_impl)},
    {JSValue{"map"}, JSValue::new_function(&JSArray::map_impl)},
    {JSValue{"filter"}, JSValue::new_function(&JSArray::filter_impl)},
    {JSValue{"reduce"}, JSValue::new_function(&JSArray::reduce_impl)},
    {JSValue{"join"}, JSValue::new_function(&JSArray::join_impl)},
};

JSArray::JSArray() : JSBase(), internal{new std::vector<JSValue>{}} {
  for (const auto &entry : JSArray_prototype) {
    this->properties.push_back(entry);
  }

  // Create a getter-only prop for `length`
  auto length_prop = JSValue::with_getter_setter(
      JSValue::new_function(
          [=](JSValue thisArg, std::vector<JSValue> &args) mutable -> JSValue {
            auto arr = std::get<JSValueType::ARRAY>(thisArg->boxed_value());
            return JSValue{arr->internal.size()};
          }),
      JSValue::undefined() // No setter (for now)
  );
  this->properties.push_back({JSValue{"length"}, length_prop});
};
```

As you can tell, I once again took a bunch of shortcuts. I only implemented a
subset of array methods, and I didn't implement a setter for `.length`.

### If, loops and other control flow

`if`, `for`, `while` and friends are all pretty much transpiled 1:1. The only
thing I needed to look out for is that a C++ `if` expects a C++
`bool` and a `JSValue`, so the transpiler appends a `.coerce_to_bool()` to
each conditional.

### Exceptions

While exceptions got added last, I'll cover them now as they are just as boring
as control structures: JS has `try{...} catch{...}`, C++ has 
`try{...} catch{...}`. You do the math. I did not bother to implement support
for JS' `finally{...}
`.

Note that WASI-SDK does not support C++ exceptions yet, even though exceptions
have landed in WebAssembly natively. Apparently, the Emscripten folks needs to
upstream their patches to libunwind.

### Iterators

With half an eye on the use-case of processing JSON, I wanted to be
able to iterate over arrays or objects. JavaScript has for-of loops with which
you can iterate over an iterable. In JS, an iterable is any object that
implements the [iteration protocol].

In C++, on the other hand, any type is iterable if it has a `begin()` and a
`end()` method. These functions return iterator objects that must overload the
dereferencing operator (`*it`), the postfix increment operator (`it++`) and
the comparision operator (`it1 == it2`). With that in place, most of the stdlib
functions like `std::for_each` or the range-for loop (`for(auto item : array)
{ ... }`) will work.

The syntactic translation is, once again, fairly straight forward. The core of
the work is implementing the C++ iteration protocol as and building an adapter
to the JS iteration protocol. I.e. adding `begin()` and `end()` methods to
`JSValue`, in which they look up whether the `JSValue` has a `Symbol.iterator`
property and if so, it calls it.

I could have implemented `Array`s iterator function in plain C++, but I was
going to need to learn C++20 coroutines to add support for generators anyway,
so I used those instead.

### Coroutines

C++20 brought support for stackless coroutines. A coroutine, just like
generators in JS, is a pausable, special function. If the C++ compiler
encounters a coroutine in your code, it creates a data structure that holds all
necessary state and will take care of storing that state on the heap for you
(hence "stackless"). Upon resuming the coroutine, it will restore the state and
continue running the function where it left of previously. The protocol (i.e.
the expected method and data types) are honestly not straight forward, and I am
glad to have found [David Mazières blog post on Coroutines][coroutines] that I
followed quite closely.

Syntactically, I once again took an easy route. Generators are just special
functions, so I just created yet another special constructor on `JSValue`:

```js
function* myGenerator() {
  // ... body ...
}
```
... transpiles to ...
```cpp
JSValue::new_generator_function([=](JSValue thisArg, std::vector<JSValue>& args) mutable -> JSGeneratorAdapter {
  // ... body ...
}
```

The C++ recognizes this closure as a coroutine because it returns a
`JSGeneratorAdapter`. This is a custom class that implements the previously
mentioned C++20 coroutine protocol which David explains in detail in his blog
post.

## Input and output

To make sure that all of this works as expected, I wanted to write and run
some automated end-to-end tests. The idea is that a test contains a JavaScript
program which gets compiled to C++, then compiled to a real, native binary,
then the binary gets run  and its output is compared against a pre-defined
string.

One piece from the chain is missing: Generating output. Luckily, both POSIX
and WASI share the most fundamental function definitions (`read` and `write`)
for reading from and writing to file descriptors, so - for simplicity - I just
exposed those to JS:

```cpp
static JSValue write_to_stdout(JSValue thisArg, std::vector<JSValue> &args) {
  JSValue data = args[0];
  std::string str = data.coerce_to_string();
  write(1 /* stdout */, str.c_str(), str.size());
  return JSValue{true};
}

static JSValue read_from_stdin(JSValue thisArg, std::vector<JSValue> &args) {
  // ...
}

JSValue create_IO_global() {
  JSValue global = JSValue::new_object({
      {JSValue{"read_from_stdin"}, JSValue::new_function(read_from_stdin)},
      {JSValue{"write_to_stdout"}, JSValue::new_function(write_to_stdout)}
  });
  return global;
}
```

The `create_IO_global()` function is something the transpiler injects into
every program as part of the so-called prelude, making the `IO` object available
as a global. If your program doesn't use it, the C++ compiler's
Dead Code Eliminiation (DCE) will remove it for you! I used this infrastructure
to write a whole [battery of tests]. For example:

```rust
#[test]
fn for_loop() -> Result<()> {
    let output = compile_and_run(
        r#"
            let v = [];
            for(let i = 0; i < 4; i++) {
                v.push(i)
            }
            IO.write_to_stdout(v.length == 4 ? "y" : "n");
        "#,
    )?;
    assert_eq!(output, "y");
    Ok(())
}
```

... which compiles to this C++ program (after some minimal manual cleanup):

```cpp
int prog() {
  auto IO = create_IO_global();
  auto v = JSValue::new_array({});

  for (JSValue i = JSValue{0}; (i < JSValue{4}).coerce_to_bool(); i++) {
    v[JSValue{"push"}](i.boxed_value());
  }

  IO[JSValue{"write_to_stdout"}](
    (v[JSValue{"length"}]) == JSValue{4}).coerce_to_bool()
      ? JSValue{"y"}
      : JSValue{"n"}
  );
  return 0;
}

int main() {
  try {
    prog();
  } catch (std::string e) {
    printf("EXCEPTION: %s\n", e.c_str());
  }
}
```
And that's how the sausage is made. Now that you know how it all works, we can
circle back to the original statement of this blog post:

## Dead end

I think this technique is a dead end. I didn't even benchmark this because
I don't think it can compete with a proper JavaScript VM, let alone a JIT
compiler. Every operator is just a big collection of `if`-`else` chains to
handle the types. Every. Operator.

Methods are kept in a list of tuples, and every property access has to iterates
over the entire list. Doing this dynamic lookup negates many of the C++
compiler's superpowers: It can't perform inlining or DCE, as the 
string-based indirection prevents static analysis. If I were to write a fully
ES2016- compliant transpiler this way, I don't think I'd end up with something
smaller (or faster) than compiling QuickJS to Wasm.

I think a much more interesting and promising approach is do an 
"Almost TypeScript"; something like [AssemblyScript]: Instead of implementing 
one uber-type called `JSValue`, I'd implement each type in its own C++ class.
I'd write a similarly simple transpiler that turns JS into C++, but using
using the TypeScript type annotations to strictly define which C++ classes
are being instantiated and used. All the hard stuff (type checking, inlining,
optimization) can be deferred to the C++ compiler. You'd get features like
closures and generators for almost free, as C++20 already has those features.
AssemblyScript still does not have support for closures or generators.

I don't regret building this at all. It's been incredibly fun. I hope this was
useful in some way.

[Shopify Functions]: https://shopify.dev/api/functions
[WebAssembly]: https://webassembly.org/
[WASI]: https://wasi.dev/
[QuickJS]: https://bellard.org/quickjs/
[javy]: https://github.com/shopify/javy
[asm.js]: http://asmjs.org/
[WASI-SDK]: https://github.com/WebAssembly/wasi-sdk
[Evolutionary Design]: https://www.industriallogic.com/blog/evolutionary-design/
[Coroutines]: https://www.scs.stanford.edu/~dm/blog/c++-coroutines.html
[call by reference]: /things/deep-copy/index.html#:~:text=Uzbek%20translation%3A%20O%27zbek-,Call%20by%20reference,-JavaScript%20passes%20everything
[swc]: https://swc.rs/
[IEEE-754]: https://en.wikipedia.org/wiki/IEEE_754
[iteration protocol]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
[jsxx]: https://github.com/surma/jsxx
[assemblyscript]: https://www.assemblyscript.org/
[sy brand]: https://twitter.com/TartanLlama
[josh lospinoso]: https://twitter.com/jalospinoso
[variadic cpp]: https://twitter.com/DasSurma/status/1556409343347761154
[wasmtime]: https://wasmtime.dev/
[spiderwasm]: https://bytecodealliance.org/articles/making-javascript-run-fast-on-webassembly
[battery of tests]: https://github.com/surma/jsxx/blob/main/src/test.rs
