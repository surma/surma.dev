---json
{
  "title": "Rust to WebAssembly the hard way",
  "date": "2023-02-13",
  "socialmediaimage": "social.jpg",
  "live": true
}

---

What follows is a brain dump of everything I know about compiling Rust to WebAssembly. Enjoy.

<!-- more -->

Some time ago, I wrote a blog post on [how to compile C to WebAssembly without Emscripten][c to wasm], i.e. without the default tool that makes that process easy. In Rust, the tool that makes WebAssembly easy is called [wasm-bindgen], and we are going to ditch it! At the same time, Rust is a bit different in that WebAssembly has been a first-class target for a long time and the standard library is laid out to support it out of the box.

## Rust to WebAssembly 101

Let’s see how we can get Rust to emit WebAssembly with as little deviation from the standard Rust workflow as possible. If you look around The Internet, a lot of articles and guides tell you to create a Rust library project with `cargo init --lib` and add this line to your `Cargo.toml`:

|||codediff|toml
  [package]
  name = "my_project"
  version = "0.1.0"
  edition = "2021"
  
+ [lib]
+ crate-type = ["cdylib"]
     
  [dependencies]
|||

Without setting the crate type to `cdylib`, the Rust compiler would emit a `.rlib` file, which is Rust’s own library format. While the name `cdylib` implies a dynamic library that is C-compatible, I suspect it really just stands for “use the interoperable format”, or something to that effect.

For now, we’ll work with the default/example function that Cargo generates when creating a new library:

```rust
pub fn add(left: usize, right: usize) -> usize {
    left + right
}
```

With all that in place, we can now compile this library to WebAssembly:

```
$ cargo build --target=wasm32-unknown-unknown --release
```

You’ll find a freshly generated WebAssembly module in `target/wasm32-unknown-unknown/release/my_project.wasm`. I’ll continue to use `--release` builds throughout this article as it makes the WebAssembly module a lot more readable when we disassemble it.

### Executable vs library

You don’t have to create a library, you can also create a Rust executable (via `cargo init --bin`). Note, however, that you either have to have a `main()` function with the well-stablished signature, or you have to shut the compiler up using `#![no_main]` to let it know that the absence of a `main()` is intentional.

Is that better? It seems like a question of taste to me, as both approaches seem to be functionally equivalent and generate the same WebAssembly code. Most of the time, WebAssembly modules seem to be taking the role of a library more than the role of an executable (except in the context of [WASI] — more on that later!), so the library approach seems semantically preferable to me. Unless noted otherwise, I’ll be using the library setup for the remainder of this article. 

### Exporting

Continuing with the library-style setup, let’s take a look at the WebAssembly code that the compiler generates. For that purpose, I recommend the [WebAssembly Binary Toolkit][wabt] (“wabt” for short), which provides helpful tools like `wasm2wat`. While you are at it, also make sure you have [binaryen] installed, as we need `wasm-opt` later in this article. Binaryen also provides `wasm-dis`, which serves a similar purpose to `wasm2wat`, but does not emit WebAssembly Text Format (WAT). It emits the less-standardized WebAssembly S-Expression Text Format (WAST). Lastly, there is [wasm-tools] by the ByteCodeAlliance which provides `wasm-tools print`.

```
$ wasm2wat ./target/wasm32-unknown-unknown/release/my_project.wasm
```

This command will convert a WebAssembly binary to WAT:

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

It is with outrage that we discover that our `add` function has been completely removed from the binary. All we are left with is a stack pointer, and two globals designating where the data section ends and the heap starts. Turns out declaring a function as `pub` is _not_ enough to get it to show up in our final WebAssembly module. I kinda wish it were enough, but I suspect `pub` is exclusive about Rust module visibility, not about linker-level symbol visibility.

The quickest way to make sure the compiler does not remove a function we care about is to add the `#[no_mangle]` attribute, although I am not a fan of the naming.

|||codediff|rust
+ #[no_mangle]
  pub fn add(left: usize, right: usize) -> usize {
      left + right
  }
|||

It is rarely necessary, but you can export a function with a different name than its Rust-internal name by using `#[export_name = "..."]`. 

Having marked our `add` function as an export, we can compile the project again and inspect the resulting WebAssembly file:

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

This module can be instantiated with the vanilla WebAssembly APIs:

```js
const importObj = {};

// Node
const data = require("fs").readFileSync("./my_project.wasm");
const {instance} = await WebAssembly.instantiate(data, importObj);

// Deno
const data = await Deno.readFile("./my_project.wasm");
const {instance} = await WebAssembly.instantiate(data, importObj);

// For Web, it’s advisable to use `instantiateStreaming` whenever possible:
const response = await fetch("./my_project.wasm");
const {instance} = 
  await WebAssembly.instantiateStreaming(response, importObj);

instance.exports.add(40, 2) // returns 42
```

And suddenly, we have pretty much all the power of Rust at our fingertips to write WebAssembly. 

Special care needs to be taken with functions at the module boundary (i.e. the ones you call from JavaScript). At least for now, it’s best to stick to types that map cleanly to [WebAssembly types] (like `i32` or `f64`). If you use higher-level types like arrays, slices, or even owned types like `String`, the function might end up with more parameters than they have in Rust and generally requires a deeper understanding of memory layout and similar principles.

### ABIs

On that note: Yes, we are successfully compiling Rust to WebAssembly. However, in the version of Rust _might_ emit a WebAssembly module with completely different function signatures. The way function parameters are passed from caller to callee (e.g. as a pointer to a memory or as an immediate value) is part of the Application Binary Interface definition, or “ABI” for short. `rustc` uses Rust’s ABI by default, which is not stable and mostly consider a Rust internal.

To stabilize this situation, we can explicitly define which ABI we want `rustc` to use for a function. This is done by using the [`extern`][extern] keyword. One long-standing choice for inter-language function calls is the [C ABI], which we will use here. The C ABI won’t change, so we can be sure that our WebAssembly module interface won’t change either.

|||codediff|rust
  #[no_mangle]
- pub fn add(left: usize, right: usize) -> usize {
+ pub extern "C" fn add(left: usize, right: usize) -> usize {
      left + right
  }
|||

We could even omit the `"C"` and just use `extern`, as the C ABI is the default alternative ABI.  

### Importing

One important part of WebAssembly is its sandbox. It ensures that the code running in the WebAssembly VM gets no access to anything in the host environment apart from the functions that were explicitly passed into the sandbox via the imports object.

Let’s say we want to generate random numbers in our Rust code. We could pull in the `rand` Rust crate, but why ship code for something if there is already something in the host environment. As a first step, we need to declare that our WebAssembly module expects an import:

|||codediff|rust
+ #[link(wasm_import_module = "Math")]
+ extern "C" {
+     fn random() -> f64;
+ }
  
  #[export_name = "add"]
  pub fn add(left: f64, right: f64) -> f64 {
-     left + right  
+     left + right + unsafe { random() }
  }
|||

`extern "C"` _blocks_ (not to be confused with the `extern "C"` _functions_ above) declare functions that the compiler expects to provided by ”someone else” at link time. This is usually how you link against C libraries in Rust, but the mechanism works for WebAssembly as well. However, external functions are always implicitly unsafe, as the compiler can’t make any safety guarantees for non-Rust functions. As a result, we can’t call them unless we wrap invocations in `unsafe { ... }` blocks.

The code above will _compile_, but it won’t run. Our JavaScript code throws an error and needs to be updated to satisfy the imports we have specified. The imports _object_ is a dictionary of import _modules_, each being a dictionary of import _items_. In our Rust code we declared an import module with the name `"Math"`, and expect a function called `"random"` to be present in that module. These values have of course been carefully chosen so that we can just pass in the entire `Math` object.

```js
  const importObj = {
    Math: {
      random: () => Math.random(),
    }
  };

  // or
  
  const importObj = { Math };
```

To avoid having to sprinkle `unsafe { ... }` everywhere, it is often desirable to write wrapper functions that restore the safety invariants of Rust. This is a good use-case for Rust’s inline modules:

```rust

mod math {
    mod math_js {
        #[link(wasm_import_module = "Math")]
        extern "C" {
            pub fn random() -> f64;
        }
    }

    pub fn random() -> f64 {
        unsafe { math_js::random() }
    }
}

#[export_name = "add"]
pub extern "C" fn add(left: f64, right: f64) -> f64 {
    left + right + math::random()
}
```

By the way, if we hadn’t specified the `#[link(wasm_import_module = ...)]` attribute, the functions will be expected on the default `env` module. Also, just like you can change the name a function is exported with using `#[export_name = "..."]`, you can change the name a function is imported under by using `#[link_name = "..."]`.

### Higher-level types

I said earlier that for functions at the module boundary, it is best to stick to value types that map cleanly to the data types that WebAssembly supports. Of course, the compiler does allow you to use higher-level types as function parameters and return values. What the compiler emits in those cases is defined in the [C ABI] (apart from [a bug][rustc wasm bug] where `rustc` currently doesn’t fully adhere to the C ABI).

Without going into too much detail, sized types (like structs, enums, etc) are turned into a simple pointer. Arrays and Tuples, which are both sized types, get special treatment and are converted to an immediate value if they use less then 32 bits. Things get even more complicated if we look at function return values: If you return an array type bigger than 32 bits, the function will get _no_ return value and instead will get an additional function parameter of type `i32`, which the function will use a pointer to a place to store the result. If a function returns a tuple, it will always turn into a function parameter, regardless of the tuple’s size.

A function parameter with an unsized type (`?Sized`), like `str`, `[u8]` or `dyn MyTrait`, is split into two parameters: One value is the pointer to the data, the other value is a pointer to a bit of metadata. In the case of a `str` or a slice, the metadata is the length of the data. In the case of a trait object, it’s the virtual table (or vtable), which is a list of function pointers to the individual trait function implementations. If you want to know more details about what a VTable in Rust looks like, I can recommend [this article][vtable] by Thomas Bächler. 

I’m skipping over loads of detail here, because unless you are trying to write the next wasm-bindgen, I would recommend relying on existing tools rather than reinventing this wheel.

## Module size

When deploying WebAssembly on the web, the size of the WebAssembly binary matters. Every byte needs to go over the network and through the browser’s WebAssembly compiler, so a smaller binary size means less time spent waiting for the user until the WebAssembly starts working. If we build our default project from above as a release build, we get a whopping 1.7MB of WebAssembly. That does not seem right for adding two numbers.

> **Data sections:** Often, a good chunk of a WebAssembly module is made up of data sections. I.e. static data that gets copied to the linear memory at some point. Those sections are fairly cheap as the compiler just skips them, which is something to keep in mind when analyzing and optimizing module startup time.

A quick way to inspect the innards of a WebAssembly module is `llvm-objdump` that should be available on your system. Alternatively, you can use `wasm-objdump` which is part of [wabt] and generally provides the same interface. 

```
$ llvm-objdump -h target/wasm32-unknown-unknown/release/my_project.wasm

target/wasm32-unknown-unknown/release/my_project.wasm: file format wasm

Sections:
Idx Name            Size     VMA      Type
  0 TYPE            00000007 00000000
  1 FUNCTION        00000002 00000000
  2 TABLE           00000005 00000000
  3 MEMORY          00000003 00000000
  4 GLOBAL          00000019 00000000
  5 EXPORT          0000002b 00000000
  6 CODE            00000009 00000000 TEXT
  7 .debug_info     00062c72 00000000
  8 .debug_pubtypes 00000144 00000000
  9 .debug_ranges   0002af80 00000000
 10 .debug_abbrev   00001055 00000000
 11 .debug_line     00045d24 00000000
 12 .debug_str      0009f40c 00000000
 13 .debug_pubnames 0003e3f2 00000000
 14 name            0000001c 00000000
 15 producers       00000043 00000000
```

`llvm-objdump` is quite versatile and offers a familiar CLI for people who have experience developing for other ISAs in assembly. However, specifically for debugging binary size, it lacks simple helpers like ordering the sections by size, or breaking the `CODE` section up by function. Luckily, there is another WebAssembly-specific tool called [Twiggy], that excels at this:

```
$ twiggy top target/wasm32-unknown-unknown/release/my_project.wasm
 Shallow Bytes │ Shallow % │ Item
───────────────┼───────────┼─────────────────────────────────────────
        652300 ┊    36.67% ┊ custom section '.debug_str'
        404594 ┊    22.75% ┊ custom section '.debug_info'
        285988 ┊    16.08% ┊ custom section '.debug_line'
        254962 ┊    14.33% ┊ custom section '.debug_pubnames'
        176000 ┊     9.89% ┊ custom section '.debug_ranges'
          4181 ┊     0.24% ┊ custom section '.debug_abbrev'
           324 ┊     0.02% ┊ custom section '.debug_pubtypes'
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

It’s now clearly visible that all main contributors to the module size are custom sections, which — by definition — are not relevant to the execution of the module. Their names imply that they contain information that is used for debugging, so the fact that these sections are emitted for a `--release` build is somewhat surprising. It seems related to a long-standing bug, where _our_ code is compiled without debug symbols, but the pre-compiled standard library on our machine still has debug symbols.

 To address this we add another line to our `Cargo.toml`:

```toml
[profile.release]
strip = true
```

This will cause `rustc` to strip all custom sections, including the one that provides function names. This can be undesirable at times because now the output of `twiggy` will just say `code[0]` or similar for a function. If you want to keep function names around, we can use a specific strip mode:

|||codediff|toml
  [profile.release]
- strip = true
+ strip = "debuginfo"
|||

If you need super fine-grained control, you can go back and disable stripping in `rustc` altogether and use `llvm-strip` manually (or `wasm-strip` from [wabt]). This allows you control over which custom sections should be kept around.

```
$ llvm-strip --keep-section=name target/wasm32-unknown-unknown/release/my_project.wasm
```

After stripping, we are left with a module of a whopping 116B. Disassembling it shows that the only function in that module is called `add` and executes `(f64.add (local.get 0) (local.get 1))`, which means the Rust compiler was able to emit optimal code. Of course, staying on top of binary size gets more complicated with a growing code base.

### Custom Section

Fun fact: We can use Rust to add our own custom sections to a WebAssembly module. If we declare an array of bytes (not a slice!), we can add a `#[link_section = ...]` attribute to pack those bytes into its own section.

```rust
const _: () = {
    #[link_section = "surmsection"]
    static SECTION_CONTENT: [u8; 11] = *b"hello world";
};
```

And we can extract this data using the [`WebAssembly.Module.customSection()` API][customsection] or using `llvm-objdump`:

```

$ llvm-objdump -s -j surmsection target/wasm32-unknown-unknown/release/my_project.wasm

target/wasm32-unknown-unknown/release/my_project.wasm: file format wasm
Contents of section surmsection:
 0000 68656c6c 6f20776f 726c64             hello world
```

### Sneaky bloat

I have seen a couple of complaints online about how big WebAssembly modules created by Rust are that do a seemingly small job. In my experience, there are three reasons why WebAssembly binaries created by Rust can be large:

* Debug build (i.e. forgetting to pass `--release` to `Cargo`)
* Debug symbols (i.e. forgetting to run `llvm-strip`)
* Unintentional string formatting and panics 

We have looked at the first two. Let’s take a closer look at the last one. This innocuous program compiles to 18KB of WebAssembly:

```rust
static PRIMES: &[i32] = &[2, 3, 5, 7, 11, 13, 17, 19, 23];

#[no_mangle]
extern "C" fn nth_prime(n: usize) -> i32 {
    PRIMES[n]
}
```

Okay, maybe not so innocuous after all. You might already know where I’m going with this.

### Panicking

A quick look at `twiggy` shows that the main contributors to the Wasm module size are functions related to string formatting, panicking and memory allocations. And that makes sense! The parameter `n` is unsanitized and used to index an array. Rust has no choice but to inject bounds checks. If a bounds check fails, Rust panics, which requires creating a nicely formatted error message and stack trace.

One way to handle this is to do the bounds checking ourselves. Rust’s compiler is really good at only injecting checks when needed.

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
+     PRIMES.get(n).copied().unwrap_or(-1)
  }
|||

A third way would be to use some of the `unchecked` methods that Rust explicitly provides. These open the door to undefined behavior and as such are `unsafe`, but if you are okay carrying the burden to ensure safety, the gain in performance (or file size) can be significant!

|||codediff|rust
  fn nth_prime(n: usize) -> i32 {
-     PRIMES[n]
+     unsafe { *PRIMES.get_unchecked(n) }
  }
|||

We can try and stay on top of where we might cause a panic and try to handle those paths manually. However, once we start relying on third-party crates this is less and less likely to succeed, because we can’t easily change how the library does its error handling internally.

### LTO

We’ll probably have to make our peace with the fact that once we can’t avoid having a code path for panics in our code base. While we can try and mitigate the impact of panics (and we will do that!), there is a rather powerful optimization that will often yield some significant code saving. This optimization pass is provided by LLVM and is called [LTO (Link-Time Optimization)][lto]. `rustc` compiles and optimizes each crate, and only then does it link it everything into the final binary. However, there are certain optimizations that only become apparent _after_ linking. For example, many functions have different branches depending on the input. During compile time, you can only see the invocations of the functions from within the same crate. At link time, you know _all_ possible invocations of any given function, which means it might now be possible to eliminate some of these code branches. 

LTO is turned off by default, as it is quite a costly optimization that can slow down compile times significantly, especially in bigger crates. It can be enabled through one of `rustc`’s many [codegen options], which you control in the `profile` section of your `Cargo.toml`. Specifically, we need to add this line to our `Cargo.toml` to enable LTO in release builds:

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

Another tool that should almost always be a part of your build pipeline is `wasm-opt` from [binaryen]. It is another collection of optimization passes that work purely on the WebAssembly VM instructions, agnostic to the source language they were produced with. Higher-level languages like Rust have more information to work with to apply more sophisticated optimizations, so `wasm-opt` is not a replacement the optimizations of your language’s compiler. However, it does often manage to shave a couple additional bytes off your module size.

```
$ wasm-opt -O3 -o output.wasm target/wasm32-unknown-unknown/my_project.wasm
```

In our case, `wasm-opt` reduces Rust’s 2.3K WebAssembly binary a bit further, yielding 2.0K. Pretty good! But rest assured, I won’t stop here. That’s still too large for doing a lookup in an array.

## No Standard

Rust has a [standard library][rust std], which contains a lot of abstractions and utilities that you need on a daily basis when you do systems programming: accessing files, getting the current time, or opening network sockets. It’s all in there for you to use, without having to go searching on [crates.io] or anything like that. However, many of the data structures and functions make assumptions about the environment that they are used in: They assume that the details of the hardware are abstracted into uniform APIs and they assume that they can somehow allocate (and deallocate) chunks of memory of arbitrary size. Usually, both of these jobs are fulfilled by the operating system, and most of us work atop an operating system on a daily basis.
 
However, when you instantiate a WebAssembly module via the raw API, things are different: the sandbox — one of the defining security features of WebAssembly — isolates the WebAssembly code from the host and, by extension, the operating system. Your code gets access to nothing more than a chunk of linear memory, which isn’t even managed to figure out which parts are in use and which parts are up for grabs.

> **WASI:** This is not part of this article, but just like WebAssembly is an abstraction for the processor your code is running on, [WASI] (WebAssembly Systems Interface) aims to be an abstraction for the operating system your code is running on and give you a single, uniform API to work with regardless of environment. Rust has support for WASI, although WASI itself is still in development.

This means that Rust gave us a false sense of security! It provided us with an entire standard library with no operating system to back it with. In fact, many of the stdlib modules are just [aliased][std unsupported] to fail. That means all functions that return a `Result<T>` always return `Err`, and all other functions `panic`.

### Learning from os-less devices

Just a linear chunk of memory. No central entity managing the memory or the periphery. Just arithmetic. That might sound familiar if you have ever worked with embedded systems. While modern embedded systems run Linux nowadays, smaller microprocessors don’t have enough resources to do so. [Rust also targets those hyperconstrained environments][embedded rust], and the [Embedded Rust Book] as well as the [Embedonomicon] explain how you write Rust correctly for those kinds of environments. 

To enter the world of bare metal 🤘, we have to add a single line to our code: `#![no_std]`. This crate macro tells Rust to not link against the standard library. Instead, it only links against [core][rust core]. The Embedonomicon [explains][embedo no_std] what that means quite concisely:

> The `core` crate is a subset of the `std` crate that makes zero assumptions about the system the program will run on. As such, it provides APIs for language primitives like floats, strings and slices, as well as APIs that expose processor features like atomic operations and SIMD instructions. However it lacks APIs for anything that involves heap memory allocations and I/O.
> 
> For an application, std does more than just providing a way to access OS abstractions. std also takes care of, among other things, setting up stack overflow protection, processing command line arguments and spawning the main thread before a program’s main function is invoked. A #![no_std] application lacks all that standard runtime, so it must initialize its own runtime, if any is required. 

This can sound a bit scary, but let’s take it step by step. We start by declaring our panic-y prime number program from above as `no_std`:

|||codediff|rust
+ #![no_std]
  static PRIMES: &[i32] = &[2, 3, 5, 7, 11, 13, 17, 19, 23];
  
  #[no_mangle]
  extern "C" fn nth_prime(n: usize) -> i32 {
      PRIMES[n]
  }
|||

Sadly — and this was foreshadowed by the paragraph from the Embedonomicon — as we haven’t provided some of the basics that `core` relies on. At the very top of the list, we need to define what should happen when a panic occurs in this environment. This is done by the aptly named panic handler, and the Embedonomicon gives this as an example:

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

A lot of what `std` provides are actually just re-exports from `core` and from another Rust-internal crate called `alloc`. `alloc` contains everything around memory allocations and the data structures that rely on it. By importing it, we can regain access to our trusty `Vec`.

```rust
#![no_std]
// One of the few occastions where we have to use `extern crate`
// even in Rust Edition 2021.
extern crate alloc;
use alloc::vec::Vec;

#[no_mangle]
extern "C" fn nth_prime(n: usize) -> usize {
    // Please enjoy this horrible implementation of
    // The Sieve of Eratosthenes.
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

Trying to compile this will fail, of course - we haven’t actually told Rust what our memory management looks like, and `Vec` needs to know that to function.

```

$ cargo build --target=wasm32-unknown-unknown --release
error: no global memory allocator found but one is required; 
  link to std or add `#[global_allocator]` to a static item that implements 
  the GlobalAlloc trait

error: `#[alloc_error_handler]` function required, but not found

note: use `#![feature(default_alloc_error_handler)]` for a default error handler
```

At the time of writing, in Rust 1.67, you need to provide an error handler that gets invoked when an allocation fails. In the next release, Rust 1.68, `default_alloc_error_handler` has been stabilized, which means every  non-standard Rust program will come with a default implementation of that error handler. If you want to provide your own error handler anyway, you can:

```rust
#[alloc_error_handler]
fn alloc_error(_: core::alloc::Layout) -> ! {
    core::arch::wasm32::unreachable()
}
```

With this sophisticated error handler in place, we should finally provide a way to do actual memory allocations. Just like in my [C to WebAssembly article][c to wasm], my custom allocator is going to be a minimal bump allocator, which tend to be fast _and_ small, but can’t free memory. We statically allocate an arena that will function as our heap and keep track of where the “free area” begins. Because we are not using Wasm Threads, I am also going to ignore thread safety.

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

The `#[global_allocator]` marks a global variable as the entity that manages the heap. The type of this variable must implement the [`GlobalAlloc` trait][globalalloc]. The methods on the `GlobalAlloc` trait all use `&self`, so if you want to modify any values inside the data type, you have to use interior mutability. I opted for `UnsafeCell` here. Using `UnsafeCell` makes our struct implicitly `!Sync`, which Rust doesn’t allow for global static variables. That’s why we also have to manually implement the `Sync` trait to tell Rust that we know that we are responsible to make this data type thread safe (and we are totally ignoring that). 

The reason the struct is marked as `#[repr(C)]` is solely so we can manually specify an alignment value. This way we can ensure that even the very first byte in our arena (and by extension the first pointer we return) has an alignment of 32, which should satisfy most data structures.

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

`#[global_allocator]` is not limited to `#[no_std]`! You can also use it override Rust’s default allocator and replace it with your own, as Rust’s default allocator consumes about 10K of Wasm space.

### wee_alloc 
You don’t have to implement the allocator yourself, of course. In fact, it’s probably advisable to rely on a well-tested implementation. Dealing with bugs in the allocator and subtle memory corruption is not fun. 

Many guides recommend [`wee_alloc`][wee_alloc], which is a very small (<1KB) allocator written by the Rust WebAssembly team that can also free memory. Sadly, it seems unmaintained and has an [open issue about memory corruption][wee_alloc mem corruption] and leaking memory. 

In any WebAssembly module of decent complexity, the 10KB consumed by Rust’s default allocator will make up for only a tiny fraction of the overall module size, so I recommend sticking to it and knowing that the allocator is well-tested and performant.

## wasm-bindgen

Now that we’ve done pretty much everything the hard way, we have earned a look at the convenient way of writing Rust for WebAssembly, which is using [wasm-bindgen].

They key feature of wasm-bindgen is the `#[wasm_bindgen]` macro that we can put on every function that we want to export. This macro adds the same compiler directives we added manually earlier in this article, but it does something way more useful in addition to that:

For example, if we add the macro to our `add` function from above, it emits another function called `__wbindgen_describe_add` that returns a description of our `add` function in a [numeric format][wasm-bindgen descriptor]. Concretely, the descriptor of our `add` function looks like this:

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

This is quite the simple function, but the descriptors in wasm-bindgen are capable of representing quite complex function signatures. 

> **Expand:** If you want to see what code the `#[wasm_bindgen]` macro emits, use rust-analyzer’s “Expand Macro recursively” functionality. You can run it via VS Code through the Command Palette.

What are these descriptors used for? wasm-bindgen does not just provide a macro, it also comes with a CLI we can use to post-process our Wasm binary. The CLI extracts those descriptors and uses the information to generate tailor-made JavaScript bindings (and then removes all these descriptor functions as they are no longer needed). The generated JavaScript has all the routines to deal with higher-level types, allowing you to seamlessly pass types like strings, `ArrayBuffer` or even closures.

If you want to write Rust for WebAssembly, I recommend using wasm-bindgen. wasm-bindgen doesn’t work with `#![no_std]`, but in practice that is rarely a problem.

## wasm-pack

I also quickly want to mention [wasm-pack], which is another Rust tool for WebAssembly. We have used a whole battery of tools to compile and process our WebAssembly to optimize the end result. `wasm-pack` is a tool that codifies most of these processes. It can bootstrap a new Rust project where all settings are optimized for WebAssembly. It can build the project and will invoke `cargo` with all the right flags, then it invokes the `wasm-bindgen` CLI to generate bindings and finally it will run `wasm-opt` to make sure we are not leaving any performance on the table. `wasm-pack` is also able to prepare your WebAssembly module for publishing to npm, but I have personally never used that functionality.

## Conclusion

Rust is a great language to target WebAssembly. With LTO enabled, you can get extremely small modules. The WebAssembly tooling for Rust is excellent and has gotten a lot better since I worked with it for the first time in [Squoosh]. The glue code that `wasm-bindgen` emits is both modern and tree-shaken.

I had a lot of fun learning about how it all works under the hood and it helped me understand and appreciate what all the tools are doing for me. I hope you feel similarly.

Massive thanks to [Ingrid][@opinionatedpie], [Ingvar][@rreverser] and [Saul][@saulecabrera] for reviewing this article.

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
[c abi]: https://github.com/WebAssembly/tool-conventions/blob/main/BasicCABI.md
[embedo no_std]: https://docs.rust-embedded.org/embedonomicon/smallest-no-std.html#what-does-no_std-mean
[customsection]: https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Module/customSections
[godbolt multivalue]: https://godbolt.org/z/o7Psfqh4E
[multivalue]: https://github.com/WebAssembly/multi-memory/blob/main/proposals/multi-value/Overview.md
[rustc multivalue]: https://github.com/rust-lang/rust/issues/73755
[@rreverser]: https://twitter.com/rreverser
[wasm-strip pr]: https://github.com/WebAssembly/wabt/pull/2143
[extern]: https://doc.rust-lang.org/reference/items/functions.html#extern-function-qualifier
[rustc wasm bug]: https://github.com/rustwasm/team/issues/291
[wee_alloc mem corruption]: https://github.com/rustwasm/wee_alloc/issues/105
[@opinionatedpie]: https://twitter.com/opinionatedpie
[@saulecabrera]: https://twitter.com/saulecabrera/
[wasm-tools]: https://github.com/bytecodealliance/wasm-tools
