---json
{
  "title": "Compiling Rust to WebAssembly without wasm-bindgen",
  "date": "2022-12-02",
  "socialmediaimage": "social.png"
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

Without setting the crate type to `cdylib`, the Rust compiler would emit a `.rlib` file, which is Rust’s unstable library format that may change from Rust release to Rust release. While `cdylib` implies a dynamic library that is C-compatible, I suspect it really just stands for “use the interoperable format”, or something to that effect.

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

Let’s take a look at the WebAssembly code that the default library code generates. For that purpose, I recommend you make sure you have the [WebAssembly Binary Toolkit (wabt for short)][wabt] installed, which provides helpful tools like `wasm-objdump` and `wasm2wat`.

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


#[no_mangle] or rather  #[export_name = "foo"] 

#[no_main]

#[no_std] + #[panic_handler]

cdylib vs rlib vs main

#[link(wasm_import_module = "surmspace")]
extern "C" {
    #[link_name = "rofl"]
    fn kek(x: u32) -> u32;
}

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
