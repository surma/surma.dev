---json
{
  "title": "Compiling C to WebAssembly without Emscripten",
  "date": "2019-05-26",
  "socialmediaimage": "social.png"
}
---

[Emscripten] contains much more than just a C compiler for [WebAssembly]. What if we stripped away all the bells and whistles and used _just_ the compiler?
<!--more-->

[Emscripten] is a compiler _toolchain_ for C/C++ targeting [WebAssembly]. But it does so much more than just compiling. Emscripten’s goal is to be a drop-in replacement for your off-the-shelf C/C++ compiler and make code that was _not_ written for the web run on the web. To achieve this, Emscripten emulates an entire POSIX operating system for you (or at least the parts that are used by your program). If your program uses [`fopen()`][fopen], Emscripten will bundle the code to emulate a filesystem. If you use OpenGL, Emscripten will bundle code that creates a C-compatible GL context backed by [WebGL]. Let’s strip that all away, shall we?

The _compiler_ in Emscripten’s toolchain, the program that translates C code to WebAssembly byte-code, is [LLVM]. LLVM is a modern, modular compiler framework. LLVM is modular in the sense that it never compiles one language straight to machine code. Instead, it has a _front-end compiler_ that compiles your language of choice to an _intermediate representation_ (IR) called — you might have guessed it — LLVM: Low-level Virtual Machine. The _back-end compiler_ then takes care of translating the IR to the host’s machine code. The advantage of this strict separation is that adding support for a new target “merely” requires adding a new back-end compiler. WebAssembly, in that sense, is just one of many targets that LLVM supports and has been available behind a flag for a while. Since version 8 of LLVM, the WebAssembly target is available by default. On MacOS using [homebrew], you can just install it:

```
$ brew install llvm
$ brew link --force llvm
```

To make sure you have WebAssembly support, we can go and check the back-end compiler:

```
$ llc --version
LLVM (http://llvm.org/):
  LLVM version 8.0.0
  Optimized build.
  Default target: x86_64-apple-darwin18.5.0
  Host CPU: skylake

  Registered Targets:
    … OMG so many architectures …
    wasm32     - WebAssembly 32-bit
    wasm64     - WebAssembly 64-bit
    x86        - 32-bit X86: Pentium-Pro and above
    x86-64     - 64-bit X86: EM64T and AMD64
    xcore      - XCore
  ```

We are good to go!

## Compiling C the hard way

Fair warning: I’ll bend over backwards a bit to make this happen. We’ll try to use human-readable formats for every step of the way (as much as possible). Our program for journey is going to super simple to avoid edge cases and distractions. This C program makes no use of C’s standard library and only uses `int` as a type.

```c
// Filename: add.c
int add(int a, int b) {
  return a*a + b;
}
```

What a mind-boggling feat of engineering! Especially because it’s called “add” but doesn’t actually add.

> **Note**: We’ll be looking at raw WebAssembly here. If you are struggling, that is no problem. **This part is not really required reading!** But if you are interested, I did write an introduction to [Raw Webassembly][raw webassembly] and WAT previously!

### Turning C into LLVM IR

The first step is to turn our C program into LLVM IR. This is the job of the front-end compiler `clang`, that got installed with LLVM:

```bash
clang \
  --target=wasm32 \ # Target WebAssembly
  -emit-llvm \ # Emit LLVM IR (instead of host machine code)
  -c \ # Only compile, no linking just yet
  -S \ # Emit human-readable assembly rather than binary
  add.c
```

And as a result we get `add.ll` containing the LLVM IR. **I’m only showing this here for completeness sake**. When working with WebAssembly, or even with `clang` when developing C, you _never_ get into contact with LLVM IR. 

```
; ModuleID = 'add.c'
source_filename = "add.c"
target datalayout = "e-m:e-p:32:32-i64:64-n32:64-S128"
target triple = "wasm32"

; Function Attrs: norecurse nounwind readnone
define hidden i32 @add(i32, i32) local_unnamed_addr #0 {
  %3 = mul nsw i32 %0, %0
  %4 = add nsw i32 %3, %1
  ret i32 %4
}

attributes #0 = { norecurse nounwind readnone "correctly-rounded-divide-sqrt-fp-math"="false" "disable-tail-calls"="false" "less-precise-fpmad"="false" "min-legal-vector-width"="0" "no-frame-pointer-elim"="false" "no-infs-fp-math"="false" "no-jump-tables"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "stack-protector-buffer-size"="8" "target-cpu"="generic" "unsafe-fp-math"="false" "use-soft-float"="false" }

!llvm.module.flags = !{!0}
!llvm.ident = !{!1}

!0 = !{i32 1, !"wchar_size", i32 4}
!1 = !{!"clang version 8.0.0 (tags/RELEASE_800/final)"}
```

### Turning LLVM IR into object files

The next step is invoking LLVMs backend compiler `llc` to turn the LLVM IR into an _object file_ containing a mixture of WebAssembly byte-code and additional metadata:

```bash
llc \
  -march=wasm32 \ # Target WebAssembly
  -filetype=obj \ # Output an object file
  add.ll
```

The object file called `add.o` is now ready for the final stage: Linking.

> **Note**: If we omitted `-filetype=obj` we’d get LLVM’s S-Expression format for WebAssembly, which is human-readable and somewhat similar to WAT. However, the tool that can consume these files, `llvm-mc`, doesn’t not fully support this text format yet and often fails to consume the output of `llc`.

### Linking

Each platform handles linking differently, so there is no one tool for linking in LLVM. For WebAssembly, there is `wasm-ld`. The linker assembles multiple object file into the _executable_:

```bash
wasm-ld \
  --no-entry \ # We don’t have an entry function
  --export-all \ # Export everything (for now)
  -o add.wasm \
  add.o
```

The output is 262 bytes WebAssembly module.

### Running it

Of course, the most important part is to see that this _actually_ works. [As we did in the previous blog post][raw webassembly], we can use a couple lines of inline JavaScript to load and run these WebAssembly modules.

```html
<!DOCTYPE html>

<script type="module">
  async function init() {
    const { instance } = await WebAssembly.instantiateStreaming(
      fetch("./add.wasm")
    );
    console.log(instance.exports.add(4, 1));
  }
  init();
</script>
```

If nothing went wrong, you shoud see a `17` in your DevTool’s console. **We just successfully compiled C to WebAssembly without touching Emscripten.** It’s also worth noting that we don’t have any glue code that is required to setup and load the WebAssembly module. 



## Compiling C the slightly less hard way

The amount of steps we currently have to do to get from C code to WebAssembly are a bit much. As I said, I was bending over backwards for educational purposes. Let’s stop doing that and can skip all the human-readable, intermediate formats. Or to say it another way: let’s use the C compiler for what it was intended, turning C files into object files.

```bash
clang \
  --target=wasm32 \
  -c \
  add.c

wasm-ld \
  -o add.wasm \
  --no-entry \
  --export-all \
  add.o
```

This will produce the same output as before, but with fewer commands which makes it easier to understand and modify.

## Optimizing

Let’s take a look at the WAT of our WebAssembly module by running `wasm2wat`:

```wasm
(module
  (type (;0;) (func))
  (type (;1;) (func (param i32 i32) (result i32)))
  (func $__wasm_call_ctors (type 0))
  (func $add (type 1) (param i32 i32) (result i32)
    (local i32 i32 i32 i32 i32 i32 i32 i32)
    global.get 0
    local.set 2
    i32.const 16
    local.set 3
    local.get 2
    local.get 3
    i32.sub
    local.set 4
    local.get 4
    local.get 0
    i32.store offset=12
    local.get 4
    local.get 1
    i32.store offset=8
    local.get 4
    i32.load offset=12
    local.set 5
    local.get 4
    i32.load offset=12
    local.set 6
    local.get 5
    local.get 6
    i32.mul
    local.set 7
    local.get 4
    i32.load offset=8
    local.set 8
    local.get 7
    local.get 8
    i32.add
    local.set 9
    local.get 9
    return)
  (table (;0;) 1 1 anyfunc)
  (memory (;0;) 2)
  (global (;0;) (mut i32) (i32.const 66560))
  (global (;1;) i32 (i32.const 66560))
  (global (;2;) i32 (i32.const 1024))
  (global (;3;) i32 (i32.const 1024))
  (export "memory" (memory 0))
  (export "__wasm_call_ctors" (func $__wasm_call_ctors))
  (export "__heap_base" (global 1))
  (export "__data_end" (global 2))
  (export "__dso_handle" (global 3))
  (export "add" (func $add)))
```

Wowza that’s _a lot_ of WAT. To my suprise, the module uses memory (indicated by the `i32.load` and `i32.store` operations), 8 local variables and a couple of globals. If you think you’d be able to write a shorter version by hand, you’d probably be right. The reason this program is so big is because we didn’t have any optimizations enabled. Let’s change that:


```bash
clang \
  --target=wasm32 \
  -O3 \ # Agressive optimizations 
  -c \
  add.c

wasm-ld \
  -o add.wasm \
  --no-entry \
  --export-all \
  --lto-O3 \ # Aggressive link-time optimizations
  add.o
```

After running the commands above, our `.wasm` file went down from 262 bytes to 197 bytes and the WAT is much easier on the eye, too:

```wasm
(module
  (type (;0;) (func))
  (type (;1;) (func (param i32 i32) (result i32)))
  (func $__wasm_call_ctors (type 0))
  (func $add (type 1) (param i32 i32) (result i32)
    local.get 0
    local.get 0
    i32.mul
    local.get 1
    i32.add)
  (table (;0;) 1 1 anyfunc)
  (memory (;0;) 2)
  (global (;0;) (mut i32) (i32.const 66560))
  (global (;1;) i32 (i32.const 66560))
  (global (;2;) i32 (i32.const 1024))
  (global (;3;) i32 (i32.const 1024))
  (export "memory" (memory 0))
  (export "__wasm_call_ctors" (func $__wasm_call_ctors))
  (export "__heap_base" (global 1))
  (export "__data_end" (global 2))
  (export "__dso_handle" (global 3))
  (export "add" (func $add)))
```

## Calling into the standard library.

Now, C without the standard library (called “libc”) is pretty rough. So the logical thing to look at next is how to call into the standard library and I’m going to be honest: It’s _not_ going to be easy. **I actually won’t link against any libc in this blog post.**. There are a couple of libc implementations out there that we could just grab, most notably [glibc], [musl] and [dietlibc]. However, most of these library expect to run on a POSIX operating system, which implement a specific set of _syscalls_ (calls to the system’s kernel). Since we don’t have any of that in JavaScript, _we’d_ have to implement these POSIX syscalls probably by calling out to JavaScript. This is quite the task and I am not going to write about that here. But the good news is: **This is exactly what [Emscripten] does for you.**

## Dynamic memory

With no libc at hand, fundamental C APIs like `malloc()` and `free()` are not available. In our unoptimized WAT above we have seen that the compiler will make use of the stack if necessary. So we can’t just use the WebAssembly memory however we like without risking corruption. We need to understand _how_ that memory is used.

### LLVM’s memory model

The way the WebAssembly memory is segmented is dictated by `wasm-ld` and might take C veterans a bit by surprise. Firstly, address `0` is absolutely valid in WebAssembly, but will often still be handled as an error case by a lot of C code. Secondly, _both_ the stack and the heap grow downwards (towards higher addresses). The reason for this is that WebAssembly memory can grow. As such there is no fixed end to place the stack or the heap at. The layout that `wasm-ld` uses is the following:

<figure>
  <img src="memlayout.svg" alt="A depiction of the wasm-ld’d memory layout.">
  <figcaption>Both the stack and the heap grow downwards. The stack starts at <code>__data_end</code>, the heap starts at <code>__heap_base</code>. Because the stack is placed first, it is limited to a maximum size set at compile time, which is <code>__heap_base - __data_end</code>.</figcaption>
</figure>

If we look back at the globals section in our WAT we can find these symbold defined. `__heap_base` is 66560 and `__data_end` is 1024. This means that the stack can grow to a maximum of 64KiB, which is _not_ a lot. Luckily, `wasm-ld` allows us to configure this value:

```diff
 wasm-ld \
   -o add.wasm \
   --no-entry \
   --export-all \
   --lto-O3 \
+  -z stack-size=$[8 * 1024 * 1024] \ # Set maximum stack size to 8MiB
   add.o
```

### Building an allocator

We now know that the heap starts at `__heap_base`, and since we don’t a `malloc()` we know that the memory region from there own downwards is considered the heap and is ours to control. We can place data in there however we like and don’t feat corruption as the stack is in safe distance — provided your stack does indeed stay below 8MiB. But leaving the heap as a wild west can get hairly fairly quickly, so usually some sort of dynamic memory management is needed. One option is to pull in a full `malloc()` implementation like [Doug Lea’s `malloc` implementation][dlmalloc], which is used by Emscripten today. There is also a couple of smaller implementations with different tradeoffs. 

But why don’t we write our own `malloc()`? We are this deep in, we might as well. One of the simplest allocators is a bump allocator. The advantages: It’s super fast, extremely small and simple to implement. The downside: You can’t free memory. While this seems incredibly useless at first sight, I have encountered use-cases while working on [Squoosh] where this would have been an excellent choice (but I didn’t know enough about WebAssembly at the time). The concept of a bump allocator is that we store the address of the next unallocated byte as a global. If the program requests n bytes of memory, we advance that marker by n and return the previous value:

```c
extern unsigned char __heap_base;

unsigned int bump_pointer = &__heap_base;
void* malloc(int n) {
  unsigned int r = bump_pointer;
  bump_pointer += n;
  return (void *)r;
}

void free(void* p) {
  // lol
}
```

The globals we saw in the WAT are actually defined by `wasm-ld` which means we can access them from our C code as normal variables if we declare them as `extern`. **We just wrote our own `malloc()` in, like, 5 lines of C 😱**

### Using dynamic memory

To prove that this actually works, let’s build a C function that takes an arbitrary-sized array of numbers and calculates the sum. Not very exciting, but it does force us to use dynamic memory, as we don’t know the size of the array at build time:

```c
int sum(int a[], int len) {
  int sum = 0;
  for(int i = 0; i < len; i++) {
    sum += a[i]; 
  }
  return sum;
}
```

The `sum()` function is hopefully straight forward. The more interesting question is how we can pass an array from JavaScript to WebAssembly — after all, WebAssembly only understands numbers. The general idea is to use `malloc()` _from JavaScript_ to allocate a chunk of memory, copy the values into that chunk and pass the address (a number)! to _where_ the array is located:

```html
<!DOCTYPE html>

<script type="module">
  async function init() {
    const { instance } = await WebAssembly.instantiateStreaming(
      fetch("./add.wasm")
    );
    
    const jsArray = [1, 2, 3, 4, 5];
    // Allocate memory for 5 32-bit integers
    //  and return get starting address.
    const cArrayPointer = instance.exports.malloc(5 * 4);
    // Turn that sequence of 32-bit integers
    // into a Uint32Array,  starting at that address.
    const cArray = new Uint32Array(
      instance.exports.memory.buffer, 
      cArrayPointer, // byte offset
      5 // length
     );
    // Copy the values from JS to C.
    cArray.set(jsArray);
    // Run the function, passing the starting address and length.
    console.log(instance.exports.sum(cArrayPointer, cArray.length));
  }
  init();
</script>
```

Running this you should see a very happy `15` in the DevTools console, which is indeed the sum of all the number from 1 to 5.

## Conclusion

You made it to the end. Congratiualtions! I’ll say it again: **This is not required reading. You do not need to understand all of this to be a good web developer or even to make good use of WebAssembly.** But I did want to share this journey with you as it really makes you appreciate all the work that a project like [Emscripten] does for you. At the same time, it gave me an understanding of how small purely computational modules can be. The Wasm module for the array summing ended up at just 230 bytes, _including an allocator for dynamic memory_. It took a lot of work to get there, but there might be situations where it is worth it.

[Emscripten]: https://emscripten.org
[WebAssembly]: https://webassembly.org
[fopen]: http://man7.org/linux/man-pages/man3/fopen.3.html
[WebGL]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
[LLVM]: https://llvm.org/
[homebrew]: https://brew.sh/
[raw webassembly]: /things/raw-webassembly
[glibc]: https://www.gnu.org/software/libc/
[musl]: https://www.musl-libc.org/
[dietlibc]: https://www.fefe.de/dietlibc/
[dlmalloc]: http://g.oswego.edu/dl/html/malloc.html
[squoosh]: https://squoosh.app