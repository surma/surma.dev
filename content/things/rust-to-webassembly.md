---json
{
  "title": "Rust to WebAssembly the hard way",
  "date": "2023-02-08",
  "socialmediaimage": "social.jpg",
  "live": false
}

---

For many, Rust is the first choice when targeting WebAssembly. Let’s take full control.

<!-- more -->

A long old time ago, I wrote a blog post on [how to compile C to WebAssembly without Emscripten][c to wasm], i.e. without the default tool that makes that process easy. In Rust, the tool that makes WebAssembly easy is called [wasm-bindgen], and we are going to ditch it! At the same time, Rust is a bit different in that WebAssembly was always a first-class target and the standard library is laid out to support it out of the box.

## Rust to WebAssembly 101

Let’s see how we can get Rust to emit WebAssembly with as little deviation from the standard Rust workflow as possible. If you look around the internet, a lot of articles and guides tell you to create a Rust library project with `cargo init --lib` and add this line to your `Cargo.toml`:

|||codediff|toml
  [package]
  name = "my_project"
  version = "0.1.0"
  edition = "2021"
  
+ [lib]
+ crate-type = ["cdylib"]
     
  [dependencies]
|||

Without setting the crate type to `cdylib`, the Rust compiler would emit a `.rlib` file, which is Rust’s own library format. While `cdylib` implies a dynamic library that is C-compatible, I suspect it really just stands for “use the interoperable format”, or something to that effect.

For now, we'll work with the default function that Cargo generates when creating a new library:

```rust
pub fn add(left: usize, right: usize) -> usize {
    left + right
}
```

With all that in place, we can now compile this library to WebAssembly:

```
$ cargo run --target=wasm32-unknown-unknow --release
```

You'll find a freshly generated WebAssembly module in `target/wasm32-unknown-unknown/release/my_project.wasm`. I'll continue to use `--release` builds throughout this article as it makes the WebAssembly module a lot more readable if we want to disassemble it.

### Alternative: As a binary

If you are like me and adding that line to your `Cargo.toml` makes you feel weird, there’s a way around that! If your crate is designated as a binary (i.e. created via `cargo init --bin` and/or has a `main.rs` instead of a `lib.rs`), compilation to WebAssembly will succed straight away. Well, until you realize there is a lot more code in that WebAssembly module than you bargained for. You can remove the `main()` function, buth the compiler will kick off at you. You have to actively let the compiler know that the absence of `main()` is intentional by adding the `#![no_main]` crate macro to your `main.rs`. Now the emitted WebAssembly binary looks reasonable, albeit devoid of any functions.

Is that better? It seems like a question of taste to me, as both approaches seem to be functionally equivalent and generate the same WebAssembly code. Most of the time, WebAssembly modules seem to be taking the role of a library more than the role of an executable (except in the context of [WASI], more on that later!), so the library approach seems semantically preferable to me. Unless noted otherwise, I’ll be using the library setup for the remainder of this article. 

### Exporting

Okay, we have created a library crate with the default `add` function inside, we have set the crate type to `cdylib` and we have compiled that crate to WebAssembly. Let’s take a look at the WebAssembly code that the compiler generates. For that purpose, I recommend the [WebAssembly Binary Toolkit (wabt for short)][wabt], which provides helpful tools like `wasm-objdump` and `wasm2wat`. It’s also good to have [binaryen] installed which provides `wasm-dis`, but does not emitted "proper" WebAssembly Text Format (WAT). In fact, I usually only use `wasm-opt` from binaryen.

```
$ wasm2wat ./target/wasm32-unknown-unknown/release/my_project.wasm
```

This command will convert a WebAssembly binary to WAT and output it to stdout.

```wasm
(module
  (table (;0;) 1 1 funcref)
  (memory (;0;) 16)
  (global $__stack_pointer (mut i32) (i32.const 1048576))
  (global (;1;) i32 (i32.const 1048576))
  (global (;2;) i32 (i32.const 1048576))
  (export "memory" (memory 0))
  (export "__data_end" (global 1))
  (export "__heap_base" (global 2)))
```

It is with outrage that we discover that our `add` function has been completely removed from the binary. All we are left with is a stack pointer, and two globals designating where the data section ends and the heap starts. Turns out declaring a function as `pub` is _not_ enough to get it to show up in our final WebAssembly module. I kinda wish it was enough, but I suspect `pub` is exclusive about Rust module visibility, not about linker-level visibility.

The quickest way to change the compiler's behavior is to explicitly give the function an export name:

|||codediff|rust
+ #[export_name = "add"]
  pub fn add(left: usize, right: usize) -> usize {
      left + right
  }
|||

If you don’t intend to change the functions external name, you can also use `#[no_mangle]` instead, which will have the same effect. I feel like `no_mangle` hides the true intention of the developer here, so I tend to prefer the `export_name`. 

Having given our `add` function an export name, we can compile the project again and inspect the resulting WebAssembly file:

|||codediff|wasm
  (module
+   (type (;0;) (func (param i32 i32) (result i32)))
+   (func $add (type 0) (param i32 i32) (result i32)
+     local.get 1
+     local.get 0
+     i32.add)
    (table (;0;) 1 1 funcref)
    (memory (;0;) 16)
    (global $__stack_pointer (mut i32) (i32.const 1048576))
    (global (;1;) i32 (i32.const 1048576))
    (global (;2;) i32 (i32.const 1048576))
    (export "memory" (memory 0))
+   (export "add" (func $add))
    (export "__data_end" (global 1))
    (export "__heap_base" (global 2)))
|||

This module is easy to run in Node, or Deno or even the browser:

```js
// Node
const data = require("fs").readFileSync("./my_project.wasm");
// Deno
const data = await Deno.readFile("./my_project.wasm");
// Web
const data = await fetch("./my_project.wasm").then(r => r.arrayBuffer());

const importObj = {
};
const {instance} = await WebAssembly.instantiate(data, importObj);
instance.exports.add(40, 2) // returns 42
```

And suddenly, we have pretty much all the power of Rust at our fingertips to write WebAssembly. 

> **Streaming:** On the web it is advisable to _not_ call `r.arrayBuffer()` and instead pass the `Response` straight to `WebAssembly.instantiateStreaming`. This allows the WebAssembly compiler to start compiling while the file is being downloaded.

Special care needs to be taken with functions at the module boundary (i.e. the ones you call from JavaScript). It’s best to stick to types that map cleanly to [WebAssembly types] (like `i32` or `f64`). If you use higher-level types like arrays, slices, or even owned types like `String`, it will compile, but yield a unexpected function signature and will generally become harder to use. More on that later!

### Importing

One important part of WebAssembly is its sandbox. It ensures that the code running in the WebAssembly VM gets no access to anything in the host environment apart from the functions that were explicitly passed into the sandbox via the imports object.

Let’s say we want to generate some random numbers in our Rust code. We could pull in the `rand` Rust crate, but why ship code for something if we can grab the existing implementation for free. To make that work, we need to declare that our WebAssembly module expects an import.

|||codediff|rust
+ #[link(wasm_import_module = "Math")]
+ extern "C" {
+     #[link_name = "random"]
+     fn random() -> f64;
+ }
  
  #[export_name = "add"]
  pub fn add(left: f64, right: f64) -> f64 {
-     left + right  
+     left + right + unsafe { random() }
  }
|||

`extern "C"` blocks declare functions that we assume to be provided by ”someone else” during linking. This is usually how you link against C libraries in Rust, but the mechanism works for WebAssembly as well. However, external functions are always implicitly unsafe, as the compiler can’t make any safety guarantees for non-Rust functions that are not present. As a result, we need to wrap in `unsafe { ... }` blocks whenever we call them.

This code will compile, but our JavaScript code that instantiates the module now throws an error. If a WebAssembly module expects imports, they _must_ be present on the imports object. 

The imports _object_ is a dictionary of import _modules_, that each are dicitonary of import _items_. In our Rust code we declared ab import module with the name `"Math"`, and expect a function called `"random"` to be present in that module. These values have of course been carefully chosen so that we can just pass in the entire `Math` object.

|||codediff|js
  const importObj = {
+   Math
  };
|||

To avoid having to sprinkle `unsafe { ... }` everywhere, it is often desirable to write wrapper functions that restore the safety invariants of Rust.

```rust
#[link(wasm_import_module = "Math")]
extern "C" {
    #[link_name = "random"]
    fn random_unsafe() -> f64;
}

fn random() -> f64 {
  unsafe { random_unsafe() }
}

#[export_name = "add"]
pub fn add(left: f64, right: f64) -> f64 {
    left + right + random()
}
```

By the way, if we hadn’t specified the `#[link(wasm_import_module = ...)]` attribute, the functions will be expected on the default `env` module. If `#[link_name = ...]` is not used, the function name will be used verbatim.

### Higher-level types

This section is purely informative and the result of me falling into a rabbit hole. You don’t need to know this stuff to make good use of Rust for WebAssembly! In fact, my recommendation is the opposite: Don’t deal with higher-level types yourself. Let battle-tested tools like [`wasm-bindgen`][wasm-bindgen] do it for you instead! Anyway...

I said earlier that for functions at the module boundary, it is best to stick to value types that map cleanly to the data types that WebAssembly supports. But what _does_ happen with values that do not have an obvious counterpart? I investiged!

Sized types (like structs, enums, etc) are turned into a simple pointer. As a result, each parameter or return value that is a sized type will come out as a `i32`. The exception are Arrays and Tuples, which are both sized types, but are converted depending on whether a type uses more than 32 bits. That means that the data of types like `(u8, u8)` or `[u16; 2]` will be bitpacked into a single `i32` and passed as an immediate value. Bigger types like `(u32, u32)` or `[u8; 10]` will be passed as a pointer in the form of an `i32`, pointing at the first element. Things get even more confusing if we look at function return values: If you return an array type bigger than 32 bits, the function will get _no_ return value and instead will get an additional function parameter of type `i32`, which the function will use a pointer to a place to store the result. If a function returns a tuple, it will always turn into a function parameter, regardless of the tuple's size.

Unsized types (`?Sized`), like `str`, `[u8]` or `dyn MyTrait`, are split into two values: One value is the pointer to the data, the other value is a pointer to a bit of metadata. In the case of a `str` or a slice, the metadata is the length of the data. In the case of a trait object, it’s the virtual table (or vtable), which is a list of function pointers to the individual trait function implementations. If you want to know more details about what a VTable in Rust looks like, I can recommend [this article][vtable] by Thomas Bächler. Function parameters that are unsized types are turned into _two_ parameters, one for each pointer. 

If a function has an unsized type as a return value, the function gets an addition function parameter in the first position. It's the callers responsibility to pass in a pointer where the function can store a “fat pointer”. A fat pointer is a tuple of two pointers, combining the the pointers for data and metadata into one data structure.

> **Octowords:** While not often used, Rust does have `u128` and `i128` as types. Just like fat pointers, these 128-bit wide types are split into two separate `i64` values.

As I said, this is not something you need to know to use Rust for WebAssembly. But if you want to know more, all of this _and more_ is defined in the [C ABI] for WebAssembly that LLVM utilizes.

## Module size

When deploying WebAssembly on the web, the size of the WebAssembly binary matters. Every byte needs to go over the network and through the browser’s WebAssembly compiler, so a smaller binary size means less time spent waiting for the user until the WebAssembly starts working. If we build our default project from above as a release build, we get a whopping 1.7MB of WebAssembly. That does not seem right for adding two numbers.

A quick way to inspect the innards of a WebAssembly module is `wasm-objdump`, provided by [wabt]. By printing the headers of all sections using `-h` we get a nice summary:

```
$ wasm-objdump -h target/wasm32-unknown-unknown/release/my_project.wasm

my_project.wasm:        file format wasm 0x1

Sections:

     Type start=0x0000000a end=0x00000011 (size=0x00000007) count: 1
 Function start=0x00000013 end=0x00000015 (size=0x00000002) count: 1
    Table start=0x00000017 end=0x0000001c (size=0x00000005) count: 1
   Memory start=0x0000001e end=0x00000021 (size=0x00000003) count: 1
   Global start=0x00000023 end=0x0000003c (size=0x00000019) count: 3
   Export start=0x0000003e end=0x00000069 (size=0x0000002b) count: 4
     Code start=0x0000006b end=0x00000074 (size=0x00000009) count: 1
   Custom start=0x00000078 end=0x0005e02e (size=0x0005dfb6) ".debug_info"
   Custom start=0x0005e031 end=0x0005e197 (size=0x00000166) ".debug_pubtypes"
   Custom start=0x0005e19b end=0x00087051 (size=0x00028eb6) ".debug_ranges"
   Custom start=0x00087054 end=0x00087fef (size=0x00000f9b) ".debug_abbrev"
   Custom start=0x00087ff3 end=0x000cf974 (size=0x00047981) ".debug_line"
   Custom start=0x000cf978 end=0x00167aa8 (size=0x00098130) ".debug_str"
   Custom start=0x00167aac end=0x0019f276 (size=0x000377ca) ".debug_pubnames"
   Custom start=0x0019f278 end=0x0019f299 (size=0x00000021) "name"
   Custom start=0x0019f29b end=0x0019f2e8 (size=0x0000004d) "producers"
```

`wasm-objdump` is quite versatile and offers a familiar CLI for people who have experience developing for other ISAs in assembly. However, specifically for debugging binary size, it lacks simple helpers like odering the sections by size. Luckily, there is another WebAssembly-specific tool called [Twiggy], that excels at this:

```
$ twiggy top target/wasm32-unknown-unknown/release/my_project.wasm
 Shallow Bytes │ Shallow % │ Item
───────────────┼───────────┼─────────────────────────────────────────
        622885 ┊    36.63% ┊ custom section '.debug_str'
        384938 ┊    22.64% ┊ custom section '.debug_info'
        293237 ┊    17.24% ┊ custom section '.debug_line'
        227258 ┊    13.36% ┊ custom section '.debug_pubnames'
        167592 ┊     9.85% ┊ custom section '.debug_ranges'
          3981 ┊     0.23% ┊ custom section '.debug_abbrev'
           342 ┊     0.02% ┊ custom section '.debug_pubtypes'
            67 ┊     0.00% ┊ custom section 'producers'
            25 ┊     0.00% ┊ custom section 'name' headers
            20 ┊     0.00% ┊ custom section '.debug_pubnames' headers
            19 ┊     0.00% ┊ custom section '.debug_pubtypes' headers
            18 ┊     0.00% ┊ custom section '.debug_ranges' headers
            17 ┊     0.00% ┊ custom section '.debug_abbrev' headers
            16 ┊     0.00% ┊ custom section '.debug_info' headers
            16 ┊     0.00% ┊ custom section '.debug_line' headers
            15 ┊     0.00% ┊ custom section '.debug_str' headers
            14 ┊     0.00% ┊ export "__heap_base"
            13 ┊     0.00% ┊ export "__data_end"
            12 ┊     0.00% ┊ custom section 'producers' headers
             9 ┊     0.00% ┊ export "memory"
             9 ┊     0.00% ┊ add
...
```

It’s now clearly visible that all main contributors to the module size are custom sections, which — by definition — are not relevant for the execution of the module. Their names imply that they contain information that is used for debugging, so it is somewhat surprising they are even emitted for a `--release` build. I suspect that release builds make `rustc` turn on code optimization, remove asserts and other checks. It does not affect whether debug symbols are packed into the binary.

To address this we can use `wasm-strip`, provided yet again by wabt. It’s a tool that removes everything that is unnecessary, including custom sections. After stripping, we are left with a module of a whopping 116B. Disassembling it shows that the only function in that module is called `add` and executes `(f64.add (local.get 0) (local.get 1))`, which means the Rust compiler was able to emit optimal code. Of course, staying on top of binary size gets more complicated with a growing code base.

### Sneaky bloat

I have seen a couple of complaints online about how big WebAssembly modules create by Rust are that do a seemingly small job. In my experience, there are three reasons why Rust emits surprisingly big WebAssembly binaries:

* Debug build (i.e. forgetting to pass `--release` to `Cargo`)
* Debug symbols (i.e. forgetting to run `wasm-strip`)
* String formatting and panics 

We have looked at the first two. Let’s take a closer look at the last one. This innocuous line of code compiles to 18KB of WebAssembly:

```rust
static PRIMES: &[i32] = &[2, 3, 5, 7, 11, 13, 17, 19, 23];

#[no_mangle]
fn nth_prime(n: usize) -> i32 {
    PRIMES[n]
}
```

Okay, maybe not so innocuous after all. You might already know what's going on here. 

### Panicking

A quick look at `twiggy` shows that the main contributors to the Wasm module size are functions related to string formatting and panicking (before LTO, there was also code for memory management in there). And that makes sense! The parameter `n` is unsanitized and used to index an array. Rust has no choice but to inject bounds checks. If a bounds check fails, Rust panics.

One way to handle this is to do the bounds checking ourselves. Rust's compiler is really good at proving whether undefined behavior can happen or not.

|||codediff|rust
  fn nth_prime(n: usize) -> i32 {
+     if n < 0 || n >= PRIMES.len() { return -1; }
      PRIMES[n]
  }
|||

Arguably more idiomatic would be to lean into `Option<T>` APIs to control how the error case should be handled:

|||codediff|rust
  fn nth_prime(n: usize) -> i32 {
-     PRIMES[n]
+     *PRIMES.get(n).unwrap_or(&-1)
  }
|||

A third way would be to use some of the `unchecked` methods that Rust explicitly provides. These open the door to undefined behavior and as such are `unsafe`, but if you are okay carrying the burden to ensure safety, the gain in performance (or file size) can be significant!

|||codediff|rust
  fn nth_prime(n: usize) -> i32 {
-     PRIMES[n]
+     unsafe { *PRIMES.get_unchecked(n) }
  }
|||

We can try and stay on top of where we might cause a panic and try to handle those paths manually. However, once we start relying on third-party crates this is less and less likely to succeed, because we can't easily change how the library does its error handling internally.

### LTO

We’ll probably have to make our peace with the fact that once we can’t avoid having a code path for panics in our code base. While we can try and mitigate the impact of panics (and we will do that!), there is a rather powerful optimization that will often yield some significant code saving. This optimization pass is provided by LLVM and is called [LTO (Link-Time Optimization)][lto]. `rustc` compiles and then optimizes each crate that you use and then links it all together. However, there are certain optimizations that only become apparent during link time. A lot of functions have different branches depending on the input. During compile time, you can only see the invocations of the functions from within the same crate. At link time, you know _all_ possible invocations of any given functions, so it might be possible for the linker to prove that certain paths of a function will never be taken, allowing it that code branch or even an entire function.

LTO is disabled by default, as it is quite a costly optimization that can slow down compile times significantly, especially in bigger crates. It can be enabled through one of `rustc`’s many [codegen options], which you control in the `profile` section of your `Cargo.toml`. Specifically, we need to add this line to our `Cargo.toml` to enable LTO in release builds:

|||codediff|toml
  [package]
  name = "my_project"
  version = "0.1.0"
  edition = "2021"
  
  [lib]
  crate-type = ["cdylib"]
  
+ [profile.release]
+ lto = true
|||

With LTO enabled, the stripped binary is reduced to 2.3K, which is quite impressive. The only cost of LTO is longer linking times, but if binary size is a concern, LTO should be one of the first levers you make use of as it “only” costs build time and doesn’t require code changes.

### wasm-opt

Another tool that should almost never be excluded from your build pipeline is `wasm-opt` from [binaryen]. It is another collection of optimization passes that work purely on the WebAssembly VM instructions, agnostic to the source language they were produced with. Of course, higher-level languages have more information to work with to apply more sophisticated optimizations, so `wasm-opt` is not a replacement for enabled optimizations on your language’s compiler. However, it does often manage to shave a couple additional bytes off your module size.

```
$ wasm-opt -O3 -o output.wasm target/wasm32-unknown-unknown/my_project.wasm
```

In our case, `wasm-opt` reduces Rust’s 2.3K WebAssembly binary a bit further, yielding 2.0K. But rest assured, I won’t stop here. That’s still too much for reading a value from an array lookup.

## No Standard

Rust has a [standard library][rust std], which contains a lot of abstractions and utilities that you need on a daily basis when you do systems programming. Accessing files, getting the current time or opening network sockets. It’s all in there for you to use, without having to go searching on [crates.io] or anything like that. However, many of the data structures and functions make assumptions about the environment that they are used in: They assume that the details of hardware are abstracted into uniform APIs and they assume that they can somehow allocate (and deallocate) chunks of memory of abritrary size. Usually, both of these jobs are fulfilled by the operating system, and most of us work in top an operating system.
 
However, when you instantiate a WebAssembly module via the raw API, things are different: The sandbox — one of the defining security features of WebAssmebly — isolates the WebAssembly code from the host and by extension the operating system. All your code gets access to is a chunk of linear memory, which isn’t even managed to figure out which parse are in use and which parts are up for grabs.

> **WASI:** This is not part of this article, but just like WebAssembly s ian abstraction for the processor your code is running on, [WASI] (WebAssembly Systems Interface) aims to be an abstraction for the operating system your code is running on and give you a single, uniform API to work with regardless of environment. Rust has support for WASI, although WASI itself is still in development.

This means that Rust gave us a false sense of security! It provided us with an entire standard library with no operating system to back it with. In fact, many of the stdlib modules are just [aliased][std unsupported] to fail. That means all functions that return a `Result<T>` always return `Err`, and all other functions `panic`.

### Learning from os-less devices

Just a linear chunk of memory. No central entity managing the memory or the periphery. Just arithmetic. That might sound familiar if you have ever written code for bare metal processors, as is sometimes the case when you work with embedded systems. While embedded systems often run Linux nowadays, smaller microprocessors don’t have enough resources to do so. [Rust is also a language for embedded systems][embedded rust], and the [Embedded Rust Book] as well as the [Embedonomicon] explain how you write Rust correctly for those kinds of environments. 

To enter the world of bare metal 🤘, we have to add a single line to our code: `#![no_std]`. This crate macro tells Rust to not link against the standard library. Instead, it only links against [core][rust core]. The Embedonomicon [explains][embedo no_std] what that means quite concisely:

> The `core` crate is a subset of the `std` crate that makes zero assumptions about the system the program will run on. As such, it provides APIs for language primitives like floats, strings and slices, as well as APIs that expose processor features like atomic operations and SIMD instructions. However it lacks APIs for anything that involves heap memory allocations and I/O.
> 
> For an application, std does more than just providing a way to access OS abstractions. std also takes care of, among other things, setting up stack overflow protection, processing command line arguments and spawning the main thread before a program's main function is invoked. A #![no_std] application lacks all that standard runtime, so it must initialize its own runtime, if any is required. 

This can sound a bit scary, but let’s take it step by step. We start by declaring our panic-y prime number program from above as `no_std`:

|||codediff|rust
+ #![no_std]
  static PRIMES: &[i32] = &[2, 3, 5, 7, 11, 13, 17, 19, 23];
  
  #[no_mangle]
  fn nth_prime(n: usize) -> i32 {
      PRIMES[n]
  }
|||

Sadly — and this was foreshafdowed by the paragraph in the Embedonomicon — this doesn’t compile as we need to provide some basics that `core` Rust needs to function. At the very top of the list: What should happen when a panic occurs in this environment? This is done by the aptly named panic handler, and we can get away with the Rust-equivalent of “FREEZE!”:

```rust
#[panic_handler]
fn panic(_panic: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
```

This is quite typical for embedded systems, effectively blocking the processor from making any more progress after a panic happened. However, this is not _great_ behavior on the web, so for WebAssembly I usually opt to manually emitting an `unreachable` instruction, that stops any Wasm VM in its tracks:

|||codediff|rust
  #[panic_handler]
  fn panic(_panic: &core::panic::PanicInfo<'_>) -> ! {
-     loop {}
+     core::arch::wasm32::unreachable()
  }
|||

With this in place, our program compiles again. After stripping and `wasm-opt`, the binary weighs in at 168B. Minimalism wins again!

## Memory Management

Of course, we have given up a lot by going non-standard. Without heap allocations, there is no `Box`, no `Vec`, no `String`, nor many of the other useful things. Luckily, we can get those back without having to provide an entire operating system. 

A good chunk of what `std` offers are just re-exports from `core` and from another Rust-internal crate called `alloc`. `alloc` contains everything around memory allocations and the data structures that rely on it. By importing it, we can regain access to our trusty `Vec`.

```rust
#![no_std]
extern crate alloc;
use alloc::vec::Vec;

#[no_mangle]
fn nth_prime(n: usize) -> usize {
    let mut primes: Vec<usize> = Vec::new();
    let mut current = 2;
    while primes.len() < n {
        if !primes.iter().any(|prime| current % prime == 0) {
            primes.push(current);
        }
        current += 1;
    }
    primes.into_iter().last().unwrap_or(0)
}

#[panic_handler]
fn panic(_panic: &core::panic::PanicInfo<'_>) -> ! {
    core::arch::wasm32::unreachable()
}
```

Trying to compile this will fail of course. We haven’t actually told Rust what our memory management looks like:

```

$ cargo build --target=wasm32-unknown-unknown --release
error: no global memory allocator found but one is required; link to std or add `#[global_allocator]` to a static item that implements the GlobalAlloc trait

error: `#[alloc_error_handler]` function required, but not found

note: use `#![feature(default_alloc_error_handler)]` for a default error handler
```

At the time of writing, in Rust 1.67, you need to provide an error handler that gets invoked when an allocation fails. In the next release, Rust 1.68,`default_alloc_error_handler` has been stabilized, which means every Rust non-standard Rust program will come with a default implementation of that error handler. If you want to provide your own error handler anyway, you can:

```rust
#[alloc_error_handler]
fn alloc_error(_: core::alloc::Layout) -> ! {
    core::arch::wasm32::unreachable()
}
```

Without allocation errors handled, we should finally provide a way to do actual memory allocations. Just like in my [C to WebAssembly article][c to wasm], my custom allocator is going to be a minimal bump allocator. We statically allocate an arena that will function as our heap and keep track of where the “free area” begins. Because we are not using Wasm Threads, I am also going to ignore thread safety.

```rust
use core::cell::UnsafeCell;

const ARENA_SIZE: usize = 128 * 1024;
#[repr(C, align(32))]
struct SimpleAllocator {
    arena: UnsafeCell<[u8; ARENA_SIZE]>,
    head: UnsafeCell<usize>,
}

impl SimpleAllocator {
    const fn new() -> Self {
        SimpleAllocator {
            arena: UnsafeCell::new([0; ARENA_SIZE]),
            head: UnsafeCell::new(0),
        }
    }
}

unsafe impl Sync for SimpleAllocator {}

#[global_allocator]
static ALLOCATOR: SimpleAllocator = SimpleAllocator::new();
```

The `#[global_allocator]` marks a global variable, whose type must implement the [`GlobalAlloc` trait][globalalloc], as the entity that manages the heap. The methods on the `GlobalAlloc` trait all use `&self`, so we have to use  interior mutability. I opted for `UnsafeCell` here. Using `UnsafeCell` makes our struct implicity `!Sync`, which Rust doesn’t allow for global static variables. That’s why we have to also manually implement the `Sync` trait to tell Rust that we know what we are doing. The reason the struct is marked as `#[repr(C)]` is solely so we can manually specify an alignment value. This way we can ensure that even the very first slot in our arena has an alignment of 32, which should satisfy most data structures.

Now for the actual implementation of the `GlobalAlloc` trait:

```rust
unsafe impl GlobalAlloc for SimpleAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let size = layout.size();
        let align = layout.align();

        // Find the next address that has the right alignment.
        let idx = (*self.head.get()).next_multiple_of(align);
        // Bump the head to the next free byte
        *self.head.get() = idx + size;
        let arena: &mut [u8; ARENA_SIZE] = &mut (*self.arena.get());
        // If we ran out of arena space, we return a null pointer, which
        // signals a failed allocation.
        match arena.get_mut(idx) {
            Some(item) => item as *mut u8,
            _ => core::ptr::null_mut(),
        }
    }

    unsafe fn dealloc(&self, _ptr: *mut u8, _layout: Layout) {
        /* lol */
    }
}
```

As with any good bump allocator, you can’t free memory.

`#[global_allocator]` is not limited to `#[no_std]`! You can override Rust's default allocator and replace it with your own, as Rust's default allocator consumes about 10K of Wasm space.

### wee_alloc & lol_alloc

You don’t have to implement the allocator yourself, of course. In fact, it’s probably advisable to rely on a well-tested implementation. Dealing with bugs in the allocator and subtle memory corruption is not fun. 

Many guides recommend [`wee_alloc`][wee_alloc], which is a very small (<1KB) allocator written by the Rust WebAssembly team that can also free memory. Sadly, it seems unmaintained and has an open issue about memory corruption and leaking memory. There’s a [`lol_alloc`][lol_alloc] which seems to aspire to replace `wee_alloc` and provides a modular setup so you can tune the allocator to your needs: 

```rust
use lol_alloc::{FreeListAllocator, LeakingAllocator};
use lol_alloc::{LockedAllocator, AssumeSingleThreaded};

// Better version of our bump allocator above.
#[global_allocator]
static ALLOCATOR: AssumeSingleThreaded<LeakingAllocator> = 
  AssumeSingleThreaded::new(LeakingAllocator::new());

// "Proper" allocator with added thread-safety
#[global_allocator]
static ALLOCATOR: LockedAllocator<FreeListAllocator> = 
  LockedAllocator::new(FreeListAllocator::new());

// ...
```

I don’t have any first-hand experience with `lol_alloc` outside of writing this article, but it looks good!

## wasm-bindgen

Now that we've done pretty much everything the hard way, we have earned a look at the easy way of writing Rust for WebAssembly, which is using [wasm-bindgen].

They key feature of wasm-bindgen is the `#[wasm_bindgen]` macro that you put on every function that you want to be exported. This macro adds the same compiler directives we added manually earlier in this article, but it does something way more useful in addition to that:

For example, if we add the macro to our `add` function from above, it emits another function called `__wbindgen_describe_add` and exports it. This function returns the a description of the function's signature in a [numeric format][wasm-bindgen descriptor]. The descriptor of our `add` function looks like this:

```
Function(
    Function {
        arguments: [
            U32,
            U32,
        ],
        shim_idx: 0,
        ret: U32,
        inner_ret: Some(
            U32,
        ),
    },
)
```

This is quite the simple function, but descriptor data structure is capable of representing quite complex function signatures. 

> **Expand:** If you want to see what code the `#[wasm_bindgen]` macro emits, use rust-analyzer's "Expand Macro recursively" functionality. You can run it via VS Code through the Command Palette.

wasm-bindgen is not just a crate, but also comes with a CLI, that you run as a post-processing step on our Wasm binary. The CLI extracts those descriptors and uses the information to generate tailor-made JavaScript bindings (often also called “glue code”), and then removes all these descriptor functions from the binary. The JavaScript encodes all the knowledge about higher-level types I talked about earlier, allowing you to seamlessly pass types like strings, `ArrayBuffer` or even closures.
\
If you want to write Rust for WebAssembly, wasm-bindgen should be your first choice. wasm-bindgen doesn’t work with `#![no_std]`, but in practice that is rarely a problem.

### Custom Section

Fun fact: We can use Rust to add our own custom sections to a WebAssembly module. If we declare an array of bytes (not a slice!), we can add a `#[link_section = ...]` attribute to pack those bytes into its own section.

```rust
const _: () = {
    #[link_section = "surmsection"]
    static SECTION_CONTENT: [u8; 11] = *b"hello world";
};
```

And we can extract this data using the [`WebAssembly.Module.customSection()` API][customsection] or using `wasm-objdump`:

```
$ wasm-objdump -s -j surmsection target/wasm32-unknown-unknown/release/my_project.wasm

my_project.wasm:   file format wasm 0x1

Contents of section Custom:
00d7e30: 0b73 7572 6d73 6563 7469 6f6e 6865 6c6c  .surmsectionhell
00d7e40: 6f20 776f 726c 64                        o world
```

This can come in handy if, like wasm-bindgen, you want to embed additional data into a binary for a post-processing step.

## wasm-pack

I also quickly want to mention [wasm-pack], which is another Rust tool for WebAssembly. We have used a whole battery of tools to compile and process our WebAssembly to optimize the end result. `wasm-pack` is a tool that codifies most of these processes. It can bootstrap a new Rust project where all settings are optimized for WebAssembly. It can build the project and will invoke `cargo` with all the right flags, then it invokes the `wasm-bindgen` CLI to generate bindings and finally it will run `wasm-opt` to make sure we are not leaving any performance on the table. `wasm-pack` is also able to prepare your WebAssembly module for publishing to npm, but I have personally never used that functionality.

## Conclusion

Rust is a great language to target WebAssembly. With LTO enabled and a smaller allocator, you can get extremely small modules. The WebAssembly tooling for Rust is excellent and has gotten a lot better since I worked with it for the first time in [Squoosh]. The modules are fairly small and there are many tools and control knobs to adjust module size even more. The glue code that `wasm-bindgen` emits is both modern and tree-shaken.

I had a lot of fun learning about how it all works under the hood and it helped me understand and appreciate what all the tools are doing for me. I hope you feel similarly.

[c to wasm]: /things/c-to-webassembly
[wasm-bindgen]: https://rustwasm.github.io/wasm-bindgen/
[wasm-pack]: https://rustwasm.github.io/wasm-pack/
[squoosh]: https://squoosh.app
[wabt]: https://github.com/WebAssembly/wabt
[vtable]: https://articles.bchlr.de/traits-dynamic-dispatch-upcasting
[binaryen]: https://github.com/WebAssembly/binaryen
[wasm4]: https://wasm4.org
[rust std]: https://docs.rs/std
[crates.io]: https://crates.io
[embedded rust]: https://www.rust-lang.org/what/embedded
[embedded rust book]: https://docs.rust-embedded.org/book/
[embedonomicon]: https://docs.rust-embedded.org/embedonomicon/
[rust core]: https://docs.rs/core
[build-std]: https://doc.rust-lang.org/cargo/reference/unstable.html#build-std
[rustup]: https://rustup.rs/
[std unsupported]: https://github.com/rust-lang/rust/blob/0d32c8f2ce10710b6560dcb75f32f79c378410d0/library/std/src/sys/wasm/mod.rs#L26-L27
[wee_alloc]: https://crates.io/crates/wee_alloc
[lol_alloc]: https://crates.io/crates/lol_alloc
[twiggy]: https://rustwasm.github.io/twiggy/
[wasm-bindgen descriptor]: https://github.com/rustwasm/wasm-bindgen/blob/main/crates/cli-support/src/descriptor.rs
[wasi]: https://wasi.dev/
[webassembly types]: https://webassembly.github.io/spec/core/syntax/types.html#number-types
[lto]: https://llvm.org/docs/LinkTimeOptimization.html
[codegen options]: https://doc.rust-lang.org/rustc/codegen-options/index.html#overflow-checks
[globalalloc]: https://doc.rust-lang.org/stable/core/alloc/trait.GlobalAlloc.html
[c abi]: https://github.com/WebAssembly/tool-conventions/blob/main/BasicCABI.md#function-signatures
[embedo no_std]: https://docs.rust-embedded.org/embedonomicon/smallest-no-std.html#what-does-no_std-mean
[customsection]: https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Module/customSections
