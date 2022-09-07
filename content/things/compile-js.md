---
title: "I turned JS into a compiled language (for fun and Wasm)"
date: "2022-08-23"
socialmediaimage: "social.png"
live: false
---

This is one of those times where I got so fascinated by the idea of building a thing that I forgot to ask myself whether it’s a good idea to build the thing. I don’t think it is, but maybe the lessons I learned along the way can be useful to some other folks out there.

## The Spark

While the end result of my exploration is not specific to WebAssembly (in fact, it arguably works better without WebAssembly), the original motivation was very much WebAssembly.

One of my focus areas art Shopify is [Shopify Functions], which allow developers to inject their code into Shopify’s business logic, enabling customization in even the most latency-critical use-cases. To optimize the tradeoff between security isolation, predictable performance and ultimate flexibility, Shopify uses [WebAssembly] as the exposed API, allowing developers to run any [WASI]-compatible module. To ensure that Shopify can load and (potentially) compile the Wasm module fast enough, modules are restricted to a maximum size of of 250KB.

WebAssembly allows developers to use any language that compiles to Wasm, of which JavaScript is not one. To run JavaScript in Wasm, a solution would be to compile the JS _engine_ to Wasm, and have it parse and execute your JS code. For this purpose, the Shopify Functions team created [javy], a toolchain that compiles a JS engine to Wasm and embeds your JS in the module. The engine that javy relies on is [QuickJS], a small JavaScript VM that is fully ES2015 compliant, written by Fabrice Bellard, who also created qemu, ffmpeg and tcc. The problem is that the resulting Wasm module is too big.

QuickJS parses your JS and turns it into byte code. That bytecode in turn gets executed by a VM. The advantage is that execution is a lot faster at the cost of some slower, initial parsing time. You do the conversion to bytecode ahead of time, allowing you to strip the JS parser from the Wasm module, but that doesn’t amount to enough code to get the module below the 250K threshold. Even stripping  globals that are likely unused (like `ArrayBuffer` or `Symbol`) doesn’t get us there.

> **JIT’ing**: WebAssembly is designed to store the instructions immutably and separate from the memory that it works on. That means that as of now, any form of JIT’ing is impossible. It is impossible for the WebAssembly module to execute dynamically generated instructions.

While the Shopify Functions team is looking into serious solutions to work around these constraints. I, on the other hand, will be spending the rest of the blog post looking into a less serious solution.

## Comparing JS to C++

One language that compiles really well to Wasm is C++. The whole point of Emscripten is to be a drop-in replacement for gcc/clang to compile C/C++ to Wasm. Since then, clang also supports Wasm directly. [WASI-SDK] provides a sysroot (libc, libc++ etc) to compile C/C++ to WebAssembly, targeting WASI.

Now here comes my rather amateurish observation that lead to this blog post: I think JavaScript looks a lot like C++. In fact, most of the features that JavaScript has to offer, C++20 has as well, often with extremely similar syntax. What if I could re-write JavaScript into C++ aiming to match the semantics and behavior of JavaScript? Would that yield smaller binaries? Maybe even faster ones? There’s only one way to find out.

## Transpiling JS to C++

There are a lot behaviors of JS that we have to shoe-horn onto C++. But first of all, we have to somehow bring JS’s dynamic typing to C++’s static typing.

### Dynamic typing

A variable in JS can contain any of the primitive value types: `bool`, `number`, `string`, `Function`, `Object` or `Array` (technically, I suppose, an `Array` is just a special `Object`, but it warrants its own implementation). Therea re also `Symbol` and `BigInt`, but I’ll ignore those for now. This is already kind of a problem because C++ is strongly typed, so any variable has exactly _one_ type, not one of many. However, if C can do unions, surely C++ has a counterpart. And indeed, there is a type in the C++ stdlib that allows you to define a type unions: `std::variant`. With that in hand, I could start implementing my `JSValue` class, that holds a box with a value. The value’s type is one of the primitive types.

```cpp
#include <variant>

class JSValue {
	using Box = std::variant<JSBool, JSNumber, JSString, JSFunction, JSArray, JSObject>;
	// ...
	Box box;
}
```

Using `jsValue.box.index()` we can query what the type of the underlying value is. With `std::get<JSBool>(jsValue.box)` we can get access to the underlying value. If we are access the underlying value with the wrong type, `std::get()` will throw an exception.

### Primitive types

Each of JS’ primitive types needs to be mapped to a C++ type. I decided to use a custom class for all of them to maximize control, but many are just very thin wrappers around C++ native types.

For example, `JSBool` only holds a `bool`, `JSNumber` only holds a `double`, and a `JSString` holds a `std::string` (I did not bother to deal with WTF16 for this prototype).

> **IEEE-754:** While some engines optimize `number` to use integer representations for performance reasons, the ECMAScript spec demands that all `number` are a [IEEE-754] (FIXME) floating-point number. Only when the difference is not observable to the developer can an engine swap to integers under the hood.

`JSArray` is simply a vector of `JSValue`:

```cpp
class JSArray {
	// ...
	std::vector<JSValue> internal;
}
```

`JSObject` is implemented as a list of key-value pairs. While a hash map would also have been feasible (and arguable more efficient), JS actually specifies that the order in which properties are created on an object must be preserved when iterating over them. Also, I couldn’t figure out how to make my `JSValue` work with `std::hashmap` (FIXME).

```cpp
class JSObject {
	// ...
	std::vector<std::pair<JSValue, JSValue>> internal;
}
```

### References vs Values

Another detail on JS’s primitive types is that some of them are references and some are values. Specifically, `bool`, `number` and `string` are values that are _always_ copied, while the other primitives are references. The difference can be seen when you assign one variable to another:

```js
// FIXMEEEE
let value_1 = "hello";
let value_2 = value_1;
value_2 += "!";
console.log(value_1); // Logs “hello”

let value_1 = {value: "hello"};
let value_2 = value_1;
value_2.value += "!";
console.log(value_1.value); // Logs “hello!”
```

To mimmick this behavior in C++, I have to start allocating objects and arrays on the heap so that we can pass pointers around. To prevent (a good chunk of) memory leaks, I used `std::shared_ptr`, which is a wrapper for a pointer with a reference counter. This will free most objects once they go out of scope, although cyclical data structures will never get freed this way. Oh well.

|||codediff|cpp
  class JSValue {
-   using Box = std::variant<JSBool, JSNumber, JSString, JSFunction, JSArray, JSObject>;
+   using Box = std::variant<JSBool, JSNumber, JSString, JSFunction,
+                            std::shared_ptr<JSArray>, std::shared_ptr<JSObject>>;
    // ...
    Box box;
  }
|||

### Garbage collection

JavaScript is garbage collected and allows you to pass values around without having to worry about heap vs stack allocations. Values are automatically freed once





[Shopify Functions]: https://shopify.dev/api/functions
[WebAssembly]: https://webassembly.org/
[WASI]: https://wasi.dev/
[QuickJS]: https://bellard.org/quickjs/
[javy]: https://github.com/shopify/javy
[asm.js]: http://asmjs.org/
[WASI-SDK]: https://github.com/WebAssembly/wasi-sdk
[Evolutionary Design]: https://www.industriallogic.com/blog/evolutionary-design/
[Coroutines]: https://www.scs.stanford.edu/~dm/blog/c++-coroutines.html
