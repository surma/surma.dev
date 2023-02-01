---json
{
  "title": "Compiling Rust to WebAssembly the hard way",
  "date": "2023-01-15",
  "socialmediaimage2": "social.png"
}

---

Rust’s compiler comes with WebAssembly support out of the box and with a strong tooling ecosystem to boot.

<!-- more -->

A long old time ago, I wrote a blog post on [how to compile C to WebAssembly without Emscripten][c to wasm]. It’s not something you’d want do on a daily basis, because you lose access to the standard library and it’s generally quite inconvenient. At the same time, it gives you a deeper understanding of what is happening and how much work other tools like [Emscripten] are doing for you. It can also come in handy when you really want to take control of your module and glue code size. So let’s do the same with Rust!

## Rust to WebAssembly

If you look around the internet, a lot of articles and guides tell you to create a Rust library project with `cargo init --lib` add this line to your `Cargo.toml`:

|||codediff|toml
  [package]
  name = "my_project"
  version = "0.1.0"
  edition = "2021"
  
+ [lib]
+ crate-type = ["cdylib"]
     
  [dependencies]
|||

Without setting the crate type to `cdylib`, the Rust compiler would emit a `.rlib` file, which is Rust’s unstable library format that may change from Rust release to Rust release. While `cdylib` implies a dynamic library that is C-compatible, I suspect it really just stands for “use the interoperable format, or something to that effect.

For now, we'll work with the default function that Cargo generates when creating a new library:

```rust
pub fn add(left: usize, right: usize) -> usize {
    left + right
}
```

With all that in place, we can now compile this library to WebAssembly.

```
$ cargo run --target=wasm32-unknown-unknow --release
```

and find your a freshly generated WebAssembly module in `target/wasm32-unknown-unknown/release/my_project.wasm`. I'll continue to use `--release` builds throughout this article as it makes the WebAssembly module a lot more readable when we disassemble it.

### Alternative: As a binary

If you are like me and adding that line to your `Cargo.toml` makes you feel weird, there’s a way around that! If your crate is designated as a binary (i.e. created via `cargo init --bin` and/or has a `main.rs` instead of a `lib.rs`), compilation will succeed without editing the `Cargo.toml`. Well, until you realize that the `main()` function has a fixed signature, and if you don’t want a `main()` function and remove it, the compiler aborts during compilation. But fear not! You can add the `#![no_main]` directive to your `main.rs` and shut the compiler up.

What is better? It’s a question of preference, as both approaches seem to be functionally equivalent and generate the same code. Most of the time, WebAssembly modules seem to be taking the role of a library more than the role of an executable (except in the context of WASI, which we will be talking about later!), so the library approach seems more semantically correct to me. Unless noted otherwise, I’ll be using the library setup for the remainder of this article. 

### Exporting

Let’s take a look at the WebAssembly code that the default library code generates. For that purpose, I recommend the [WebAssembly Binary Toolkit (wabt for short)][wabt] installed, which provides helpful tools like `wasm-objdump` and `wasm2wat`. It’s also good to have [binaryen] installed which provides a bunch of tools, but I really only use `wasm-opt`.

After compiling our library, your shocked eyes will notice that our `add` function has been completely removed from the binary. All we are left with is a stack pointer, and two globals designating where the data section ends and the heap starts.

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

Well, that’s no good. Turns out the `pub` declaration on our function is _not_ enough to get it to show up in our final WebAssembly module. I am not sure why the compiler is behaving that way. 

The quickest way to change the compiler's behavior is to explicitly give the function an export name:

|||codediff|rust
+ #[export_name = "add"]
  pub fn add(left: usize, right: usize) -> usize {
      left + right
  }
|||

If you don’t want to change the functions extenral name, you can also use `#[no_mangle]` instead, instructing the compiler to not mangle the symbol name during compilation. I find the `export_name` directive more descriptive in what it achieves. I will also note that function at the module boundary often end up being undiomatic, as you will inevitably pass around raw pointers. A nice pattern here is to give the function at boundary a nice name externally, but a clearly unsafe name internally and write a wrapper function to create an idiomatic signature. For example:

```rust
#[export_name = "pointer_inc"]
pub fn pointer_inc_unsafe(ptr_value: u32, delta: u32) {
    let ptr = ptr_value as *mut u32;
    unsafe {
        *ptr += delta;
    }
}

pub fn pointer_inc(ptr: &mut u32, delta: u32) {
    pointer_inc_unsafe(ptr as *mut u32 as u32, delta)
}
 ```

Compiling our `add` function again, we get the following WebAssembly module:

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

And we can easily run this WebAssembly module in Node, or Deno or even the browser:

```js
const data = /* read my_project.wasm into an ArrayBuffer */;
const importObj = {
};
const {instance} = await WebAssembly.instantiate(data, importObj);
instance.exports.add(40, 2) // returns 42
```

And with that, we can go ahead and use all of Rust to write WebAssembly modules. However, take care to stick to types that map cleanly to WebAsselby types (i.e. `u32`, `i32`, `u64`, `i64`, `f32`, `f64` and `bool`). If you use higher-level types like arrays, slices, or even owned types like `String`, it will compile, but yield a unexpected function signature that is not immediately obvious. More on that later!

### Importing

One important part of WebAssembly is the sandbox, where our code gets no access to the host environment whatsoever, unless we explicitly provide access to individual functions through imports.

Let’s say we want to get access to JavaScript’s randon number generator, so we don’t have to pull in an entire Rust crate just for that. For that to work, we need to declare what we expect to be present on the import object. 

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

If we ran our JavaScript code above again as is, it would throw an error as the WebAssembly module now expects imports that we haven’t provided. As declared, we expect an import module with the name `"Math"` to provide a function called `"random"`. These values have of course been carefully chosen so that we can just pass in the entire `Math` global to satisfy the import.

|||codediff|js
  const importObj = {
+   Math
  };
|||

The core part here is the `extern "C" { ... }` block. This is interpreted by the compiler as a list of external functions that we can be assumed to be present once the library gets linked.   In the context of WebAssembly, those semantics are mapped to imports. However, external functions are always implicitly unsafe, as the compiler can’t make any safety guarantees for non-Rust functions that are not present. As a result, we need to wrap their invocations into `unsafe { ... }`. It is often desirable to give the imported function a slightly mangled name and provide a safe wrapper function with the nice name:

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
    left + right  
}
```

If we hadn’t specified the `#[link(wasm_import_module = ...)]` attribute, the functions will be expected on the default `env` module. If `#[link_name = ...]` is not used, the function name will be used verbatim.

### Higher-level types

This section is purely informative and you don’t need to internalize or understand it to make good use of Rust for WebAssembly! In fact, my recommendation is to not deal with higher-level types yourself, but using tools like [`wasm-bindgen`][wasm-bindgen] instead!

Sized types (so structs, enums, etc) are turned into a simple pointer. As a result, each parameter or return value that is a sized type will come out as a `i32`. The exception are Arrays and Tuples, which are both sized types. Each parameter with one of these types will be translated differently depending on whether a type is bigger than 32 bits. The data of types like `(u8, u8)` or `[u16; 2]` will be squeezed inside a single `i32` and passed as an immediate value. Values of bigger types like `(u32, u32)` or `[u8; 10]` will be passed as a pointer, where the parameter is yet again a `i32`, but it will contain the address of where to find the actual value. To make things even more confusing, if you an array bigger than 32 bit as a function’s return type, it will turn into a function parameter of type `i32`. If a function returns a tuple, it will always be turned into a function parameter of `i32`, even if it is smaller than 32 bit.

In contrast, unsized types (`?Sized`), like `str`, `[u8]` or `dyn MyTrait`, are turned into fat pointers. Fat pointers are so called, because they are not just an address, but also some additional piece of metadata. So a parameter that is a fat pointer is effectively an `i32` that points to a tuple `(<pointer to start of data), <pointer to metadata>)`. In the case of a `str` or a slice, the metadata is the length of the data. In the case of a trait object, it’s the virtual table (or vtable), which is a list of function pointers to the individual trait function implementation. If you want to know more details about what a VTable in Rust looks like, I can recommend [this article][vtable] by Thomas Bächler. Just like with array, because the pointer is fat and as such bigger than 32 bit, if your function returns a type that is modelled as a fat pointer, it will be turned into a parameter. So in the cases where a return value is turned into a parameter, it is up to the caller to provide an address that can store the fat pointer for the return value!

```rust
static A_STRING: &str = "hello";
#[no_mangle]
pub fn a_string() -> &'static str {
  &A_STRING
}
```

```wasm
(module
  (type (;0;) (func (param i32)))
  ;; In Rust the function had no parameters and 
  ;; one return value. In Wasm it has one parameter
  ;; and no return values.
  (func $a_string (type 0) (param i32) 
    ;; Store length of data (i.e. 5) in the second 
    ;; field (i.e. offset 4) of the fat pointer.
    (i32.store offset=4
      (local.get 0)
      (i32.const 5)) 
    ;; Store the address of the start of the data 
    ;; in the first field of the fat pointer.
    (i32.store
      (local.get 0)
      (i32.const 1048576))) 
  ;; ... same as before ...
  (data $.rodata (i32.const 1048576) "hello"))
```

Again, none of this is something I use regularly when working with Rust and WebAssembly. But it can be helpful to know!

## Module size

When deploying WebAssembly on the web, the size of the WebAssembly binary matters. Every byte needs to go over the network and through the compiler, so a smaller binary size means less time spent waiting for the user. If we build our default project from above as a release build, we get a surprising 1.7MB of WebAssembly. That does not seem right for adding two numbers.

A quick way to inspect where those bytes are spent is to have `wasm-objdump` print a summary:

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

All the sections of significant size are custom sections, which means they are not relevant for the execution of the module. Luckily, wabt comes with `wasm-strip`, that removes everything that is unnecessary. After stripping, we are at a whopping 116B, and the only function in that module executes `(f64.add (local.get 0) (local.get 1)))`, which means the Rust compiler was able to emit optimal code.  Of course, staying on top of binary size gets more complicated once we start writing some actual code.

### Sneaky bloat

A very innocent like of code can cause a big increase in binary size. For example, this innocuous program ends up compiling to 18KB of WebAssembly.

```rust
static PRIMES: &[i32] = &[2, 3, 5, 7, 11, 13, 17, 19, 23];

#[no_mangle]
fn nth_prime(n: usize) -> i32 {
    PRIMES[n]
}
```

Okay, maybe not so innocuous after all. You might already know what's going on here. A quick look at `wasm-objdump` shows that the main contributors to the Wasm module size are functions related to string formatting, memory allocations and panicking. And that makes sense! The parameter `n` is unsanitized and yet is used to index an array. Rust has no choice but to inject bounds checks. If an out-of-bounds check fails, Rust panics.

Panics are quite informative in Rust, the problem with being informative that it involves pretty-printing a lot of information, and because the amount of information depends on the situation (specifically: the depth of the stack), this process needs to allocate memory dynamically. Panics cause our bloat!

One way to handle this is to do the bounds checking ourselves. Rust's compiler is really good at proving whether undefined behavior can happen or not.

|||codediff|rust
  fn nth_prime(n: usize) -> i32 {
+     if n < 0 || n >= PRIMES.len() { return -1; }
      PRIMES[n]
  }
|||

Alternatively, we can lean into `Option<T>` APIs to control how the error case should be handled:

|||codediff|rust
  fn nth_prime(n: usize) -> i32 {
-     PRIMES[n]
+     *PRIMES.get(n).unwrap_or(&-1)
  }
|||

A third way would be to use some of the `unchecked` methods that Rust explicitly provides. This opens the door to undefined behavior and as such is `unsafe`, but in certain scenarios (for example when the sanitization happens in the host environment), this can be acceptable or even a path for optimization, both for performance and file size.

|||codediff|rust
  fn nth_prime(n: usize) -> i32 {
-     PRIMES[n]
+     unsafe { *PRIMES.get_unchecked(n) }
  }
|||

We can try and stay on top of where we might cause a panic and try alternate ways to handle that to avoid all that code getting pulled in. However, once we pull in third-party libraries this is less and less likely to succeed, because we can't easily change how the library does its error handling.

## No Standard

Rust has a [standard library][rust std], which contains a lot of abstractions and utilities that you end up using quite a lot and they are just _there_, no need to crawl through [crates.io] or anything like that.  However, many of the data structures and functions make assumptions about the environment that they are used in: They assume that the details of hardware are abstracted into uniform APIs and they assume that they can somehow allocate (deallocate) chunks of memory at abritrary size. Often, both of these jobs are fulfilled by the operating system.

In almost all fields of coding, these assumptions are fulfilled. However, they are not when you work with raw WebAssembly: Because of the sandbox, there is no access to an operating system (and if you run WebAssembly in the browser, there's yet another sandbox preventing you from exposing it). You also just get access to a linear chunk of memory with no central entity managing which part of the memory belongs to what.

There is another field that works similarly that we can learn from: Embedded systems. While modern embedded systems often do run an entire Linux, smaller microprocessors do not. [Rust does support building for those smaller systems][embedded rust] as well, and the [Embedded Rust Book] as well as the [Embedonomicon] explain on how you write Rust correctly for those kinds of environments.

The biggest part is a crate macro called `#![no_std]`, which tells Rust to not link against the standard library. Instead, it only links against [core][rust core]. To quote the Embedonomicon:

> The `core` crate is a subset of the `std` crate that makes zero assumptions about the system the program will run on. As such, it provides APIs for language primitives like floats, strings and slices, as well as APIs that expose processor features like atomic operations and SIMD instructions. However it lacks APIs for anything that involves heap memory allocations and I/O.
> 
> For an application, std does more than just providing a way to access OS abstractions. std also takes care of, among other things, setting up stack overflow protection, processing command line arguments and spawning the main thread before a program's main function is invoked. A #![no_std] application lacks all that standard runtime, so it must initialize its own runtime, if any is required. 

This can sound a bit scary, but also a bit exciting. If we jump straight in with our panic-y program from above and make it non-standard:

|||codediff|rust
+ #![no_std]
  static PRIMES: &[i32] = &[2, 3, 5, 7, 11, 13, 17, 19, 23];
  
  #[no_mangle]
  fn nth_prime(n: usize) -> i32 {
      PRIMES[n]
  }
|||

Sadly — and this was foreshadowed by the paragraph in the Embedonomicon — we need to provide everything that `core` Rust needs to function. At the very top of the list: What should happen when a panic occurs? This is done by the aptly named panic handler, and can be something as simple as this:

```rust
#[panic_handler]
fn panic(_panic: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
```

Blocking the thread through spinning is not _great_ behavior on the web, so for WebAssembly specifically, I usually opt to manually emitting an `unreachable` instruction, that stops any Wasm VM in its tracks:

|||codediff|rust
  fn panic(_panic: &core::panic::PanicInfo<'_>) -> ! {
-     loop {}
+     core::arch::wasm32::unreachable()
  }
|||

With this in place, our program compiles again. After stripping, the binary weighs in at abour 3.3K. We still do string concatenation to fill in our `PanicInfo` struct, but we are not printing a stack trace anymore, so the all strings are available at compile time and no allocations are necessary. 

### A nightly excursion

We are reaching the point of diminishing returns, but there is a way we can do better: Abort on panic. Don’t even bother with the `PanicInfo` struct, just kill everything once something goes wrong. This functionality is called `panic_immediate_abort` and is a feature in core, which means we have to compile core ourselves. That is actually easier (and faster!) than it sounds, but is somewhat irritatingly called [build-std]. Even worse, this feature is unstable, which means we need to dip into Nightly Rust!

Luckily, installing Rust Nightly and the std source code is quite easy if you use [rustup]:

```
$ rustup toolchain add nightly
$ rustup component add rust-src --toolchain nightly
```

The (long-term) goal of build-std is to allow a crate to explicitly express its dependencies on `core`, `std` and other Rust-internals the same way you express normal dependencies, which includes a list of features. This is not quite what’s implemented, so we have to go via command line flags.

```
$ cargo +nightly build --target=wasm32-unknown-unknown --release \
     -Z build-std=core,alloc -Z build-std-features=panic_immediate_abort
```



Of course, we have given up a lot by going non-standard. Without heap allocations, there is no `Box`, no `Vec`, no `String`, and many others.

#[no_std]
#[panic_handler]
allocator

wasm32-unknown-wasi


wasm-bindgen

> i.instance.exports.__wbindgen_describe_lol()
describe 11 Function
describe 0 i8 // Shim Idx
describe 1 u8 // Num args
describe 5 u32 // Arg 0
describe 5 u32 // Ret
describe 5 u32 // Inner ret


wasm-objdump -j import -x target/wasm32-unknown-unknown/release/bindgen.wasm


Before I start, though, the WebAssembly tooling for Rust is excellent and has gotten a lot better since I worked with it in [Squoosh].
The modules are phenomenally small and even the glue code is both modern and tree-shaken. I fully recommend using these tools
when writing Rust for WebAssembly.

Rust has first-class support for WebAssembly, but also brings a strong tooling ecosystem to build high-quality WebAssembly modules.
Rust comes with some great tooling to compile and produce WebAssembly modules, like [wasm-bindgen] and [wasm-pack]. But what do these tools actually do?



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
