{
  "title": "Raw WebAssembly",
  "date": "2019-05-11",
  "socialmediaimage": "glueless.jpg",
  "live": "true"
}

Can you use the DOM in WebAssembly? Rust says yes, other people say no. I want to shine some light on what _raw_ WebAssembly can do out of the box and what has been added by layers on top.
<!--more-->

When you to to [WebAssembly.org], the very first thing that is said about WebAssembly is that it’s a “stack-based virtual machine”.

![The landing page of WebAssembly.org](webassemblyorg.jpg)

While it’s absolutely not necessary to understand what that means, it can be _helpful_ to understand what is within the capabilities of a WebAssembly module.

## Putting the “Assembly” in “WebAssembly”

While WebAssembly is strictly speaking [“Neither Web, Nor Assembly”][jsjanuary], it does share some things with other assembly languages: [The spec][spec] contains both a specification for the binary representation as well as a [human-readable text representation][wat]. This text format is called “wat” and is short for “WebAssembly text format”. You can use Wat to hand-craft WebAssembly modules. To turn a Wasm module into Wat, or to turn a Wat file back into a Wasm binary, use `wasm2wat` or `wat2wasm` from the [WebAssembly Binary Toolkit][wabt].

## A small WebAssembly module

I am not going to explain all the details of the WebAssembly virtual machine, but just going to list a couple of short examples here that should help you understand how to read Wat. If you want to know more details, I recommend browsing MDN or even the [spec].

> Note: You can follow along locally with the tools mentioned above or use [WebAssembly.studio], which also has support for Wat, C, Rust and AssemblyScript.

```
(; 
  Filename: add.wat 
  This is a block comment.
;)
(module
  (func $add (param $p1 i32) (param $p2 i32) (result i32)
    local.get $p1 ;; Push parameter $p1 onto the stack
    local.get $p2 ;; Push parameter $p2 onto the stack
    i32.add ;; Pop two values off the stack and push their sum
    ;; The top of the stack is the return value
  )
  (export "add" (func $add))
)
```

The file starts with a module expression, that is a list of declarations what the module contains. This can be a multitude of things, but in this case it’s just the declaration of a function and an export statement. Everthing that starts with `$` is an identifier and is turned into a unique number during compilation. These identifiers can be omitted (and an automatically increasing counter will be used), but it makes Wat code much harder to follow.

You can see these numbers when you disassemble a `.wasm` file with `wasm2wat`. If we run that tool on our `add.wasm` file you should see this:

```
(module
  (type (;0;) (func (param i32 i32) (result i32)))
  (func (;0;) (type 0) (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add
   )
  (export "add" (func 0))
)
```

You can see the identifiers have been replace with numbers. You can also see a `type` declaration that is generated for you by `wat2wasm`. It seems a bit redundant to define a type when it’s already fully implied by the declaration, but it will become useful when we want to talk about function imports later.

A function declaration start with the (optional) identifer, a list of parameters with their types, the return type and the body, which in itself is a list of instructions. The body is a list of [instructions] for the VM’s stack. You can push values onto the stack, pop values off the stack and replace them with the result of an operation or load and store values to memory (more about that later). A function _must_ leave exactly one value on the stack as a return value.

If you don’t like thinking in stacks, there is some syntactical sugar that Wat supports. The following two functions are equivalent:

```
(func $add (param $p1 i32) (param $p2 i32) (result i32)
  local.get $p1
  local.get $p2
  i32.add 
)

(func $add (param $p1 i32) (param $p2 i32) (result i32)
  (i32.add (local.get $p1) (local.get $p2))
)
```

The export declaration can assign a name to an item from the module declaration and make it available externally. If we compile our `add.wat` file to a `add.wasm` file and load it in the browser (or in node, if you fancy), you should see an `add()` function on the `exports` property of your module instance that you can call thusly:

```
<script>
  async function run() {
    const {instance} = await WebAssembly.instantiateStreaming(
      fetch("./add.wasm")
    );
    const r = instance.exports.add(1, 2);
    console.log(r);
  }
  run();
</script>
```

## Functions

You can have multiple functions and not all of them need to be exported:

```
;; Filename: contrived.wat 
(module
  (func $add (; …same as before… ;))
  (func $add2 (param $p1 i32) (result i32)
    local.get $p1
    i32.const 2 ;; Push the constant 2 onto the stack
    call $add ;; Call our old function
  )
  (func $add3 (param $p1 i32) (result i32)
    local.get $p1
    i32.const 3 ;; Push the constant 3 onto the stack
    call $add ;; Call our old function
  )
  (export "add2" (func $add2))
  (export "add3" (func $add3))
)
```

Notice how `add` is not exported and as such `add()` will not be callable from JavaScript. It’s only used in the bodies of our other functions.

Now there’s is also a way to _expect_ a function to be passed _to_ a WebAssembly module by specifying an import:

```
;; Filename: funcimport.wat 
(module
  ;; A function with no parameters and no return value.
  (type $log (func (param) (result)))
  ;; Expect a function called `log` on the `funcs` module
  (import "funcs" "log" (func $log))
  ;; Our function with no parameters and no return value.
  (func $doLog (param) (result)
    call $log ;; Call the imported function
  )
  (export "doLog" (func $doLog))
)
```

If we load this module with our previous loader code, it will error. We are expecting our imports to be fulfulled and we have provided none. This is where “imports object” comes into play:

```
<script>
  async function run() {
    function log() {
      console.log("This is the log() function");
    }

    const {instance} = await WebAssembly.instantiateStreaming(
      fetch("./funcimport.wasm"),
      {
        funcs: {log}
      }
    )
    instance.exports.doLog();
  }
  run();
</script>
```

Running this will cause a log to appear in the console. We just called a WebAssembly function from JavaScript, and then we called a JavaScript function from WebAssembly. Of course both these function calls could have contained parameters and return values, just keep in mind that JavaScript only has IEEE754 32-bit floats, while WebAssembly has way more types, so conversion can be lossy.

This is also a big puzzle piece how Rust makes DOM operations possible from within Rust code: [wasm-bindgen] exposes all browser APIs that you need _to_ WebAssembly through these imports (that’s a simplification!).

## Memory

There’s only so much you can do when all you have is a stack. After all, the very definition of a stack is that you can only ever reach the value that is on top. So most WebAssembly modules export a chunk of memory to work on. It’s worth noting that you can also expect to be given a memory from the host environment and that you can only have exactly one memory unit overall. 

```
;; Filename: memory.wat 
(module
  ;; Create a memory starting with a size of 1 page (= 64KiB) 
  ;; that is growable to up to 100 pages.
  (memory $mem 1 100)
  ;; Export that memory
  (export "memory" (memory $mem))
  ;; Our function with no parameters and no return value.
  (func $add (param $p1 i32) (result)
    ;; Load an i32 from address 0 and put it on the stack
    i32.const 0
    i32.load
    
    ;; Put the parameter on the stack and add the values
    local.get $p1
    i32.add 

    ;; Temporarily store the result in the parameter
    local.set $p1

    ;; Store that value at address 4
    i32.const 4
    local.get $p1
    i32.store
  )
  (export "add" (func $add))
)
```

> Note: We could avoid the temporary store in `$p1` by moving the `i32.const 4` to the very start of the function. Many people will see that as a simplification and most compilers will actually do that for you. But for educational purposes I chose the more imperative but longer version.

Memory is just a series of bits. You decide how to read or interpret it. That’s why each WebAssembly type has an associated `store` and `load` function. This is similar to how [`ArrayBuffer`s][ArrayBuffer] is just a chunk of memory that you need to interpret by using [`Float32Array`][Float32Array], [`Int8Array`][Int8Array] and friends.

Now to inspect the memory from JavaScript, we need to grab the memory from our `exports` object. From that point on, it behaves like any [`ArrayBuffer`][ArrayBuffer].

```
<script>
  async function run() {
    const {instance} = await WebAssembly.instantiateStreaming(
      fetch("./memory.wasm")
    );
    const mem = new Int32Array(instance.exports.memory.buffer);
    mem[0] = 40;
    instance.exports.add(2);
    console.log(mem[0], mem[1]);
  }
  run();
</script>
```

## So what about strings? Or objects?

[WebAssembly.org]: https://webassembly.org
[jsjanuary]: https://www.javascriptjanuary.com/blog/webassembly-neither-web-nor-assembly-but-revolutionary
[spec]: https://webassembly.github.io/spec/core/bikeshed/index.html
[wat]: https://developer.mozilla.org/en-US/docs/WebAssembly/Understanding_the_text_format
[wabt]: https://github.com/WebAssembly/wabt
[instructions]: https://webassembly.github.io/spec/core/bikeshed/index.html#instructions%E2%91%A8
[wasm-bindgen]: https://rustwasm.github.io/docs/wasm-bindgen/
[ArrayBuffer]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
[Float32Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array
[Int8Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Int8Array