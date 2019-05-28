---json
{
"title": "Compiling C to WebAssembly without Emscripten",
"date": "2019-05-26",
"socialmediaimage": "social.png"
}

---

A compiler is just a part of [Emscripten]. What if we stripped away all the bells and whistles and used _just_ the compiler?

<!--more-->

[Emscripten] is a compiler _toolchain_ for C/C++ targeting [WebAssembly]. But it does so much more than just compiling. Emscripten’s goal is to be a drop-in replacement for your off-the-shelf C/C++ compiler and make code that was _not_ written for the web run on the web. To achieve this, Emscripten emulates an entire POSIX operating system for you. If your program uses [`fopen()`][fopen], Emscripten will bundle the code to emulate a filesystem. If you use OpenGL, Emscripten will bundle code that creates a C-compatible GL context backed by [WebGL]. That requires a lot of work and also amounts in a lot of code that you need send over the wire. What if we just,… didn’t?

The _compiler_ in Emscripten’s toolchain, the program that translates C code to WebAssembly byte-code, is [LLVM]. LLVM is a modern, modular compiler framework. LLVM is modular in the sense that it never compiles one language straight to machine code. Instead, it has a _front-end compiler_ that compiles your code to an _intermediate representation_ (IR). This IR is called LLVM, as the IR is modeled around a **L**ow-**l**evel **V**irtual **M**achine, hence the name of the project. The _back-end compiler_ then takes care of translating the IR to the host’s machine code. The advantage of this strict separation is that adding support for a new architecture “merely” requires adding a new back-end compiler. WebAssembly, in that sense, is just one of many targets that LLVM supports and has been available behind a flag for a while. Since version 8 of LLVM the WebAssembly target is available by default. If you are on MacOS, you can install LLVM using [homebrew]:

```bash
$ brew install llvm
$ brew link --force llvm
```

To make sure you have WebAssembly support, we can go and check the back-end compiler:

```bash
$ llc --version
LLVM (http://llvm.org/):
  LLVM version 8.0.0
  Optimized build.
  Default target: x86_64-apple-darwin18.5.0
  Host CPU: skylake

  Registered Targets:
    # … OMG so many architectures …
    systemz    - SystemZ
    thumb      - Thumb
    thumbeb    - Thumb (big endian)
    wasm32     - WebAssembly 32-bit # 🎉🎉🎉
    wasm64     - WebAssembly 64-bit
    x86        - 32-bit X86: Pentium-Pro and above
    x86-64     - 64-bit X86: EM64T and AMD64
    xcore      - XCore
```

Seems like we are good to go!

## Compiling C the hard way

> **Note**: We’ll be looking at some low-level file formats like raw WebAssembly here. If you are struggling with that, that is ok. **You don’t need to understand this entire blog post to make good use of WebAssembly. If you are here for the copy-pastables, look at the compiler invocation in the _“Optimizing”_ section.** But if you are interested, keep going! I also wrote an introduction to [Raw Webassembly][raw webassembly] and WAT previously which covers the basics needed to understand this post.

Warning: I’ll bend over backwards here for a bit and use human-readable formats for every step of the process (as much as possible). Our program for this journey is going to be super simple to avoid edge cases and distractions:

```c
// Filename: add.c
int add(int a, int b) {
  return a*a + b;
}
```

<figcaption>What a mind-boggling feat of engineering! Especially because it’s called “add” but doesn’t actually add. More importantly: This program makes no use of C’s standard library and only uses `int` as a type.</figcaption>

### Turning C into LLVM IR

The first step is to turn our C program into LLVM IR. This is the job of the front-end compiler `clang` that got installed with LLVM:

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

<figcaption>LLVM IR is full of additional meta data and annotations, allowing the back-end compiler to make more informed decisions when generating machine code.</figcaption>

### Turning LLVM IR into object files

The next step is invoking LLVMs backend compiler `llc` to turn the LLVM IR into an _object file_:

```bash
llc \
  -march=wasm32 \ # Target WebAssembly
  -filetype=obj \ # Output an object file
  add.ll
```

The output, `add.o`, is effectively a valid WebAssembly module and contains all the compiled code of our C file. However, most of the time you won’t be able to run object files as essential parts are still missing.

If we omitted `-filetype=obj` we’d get LLVM's assembly format for WebAssembly, which is human-readable and somewhat similar to WAT. However, the tool that can consume these files, `llvm-mc`, does not fully support this text format yet and often fails to consume the output of `llc`. So instead we’ll disassemble the object files after the fact. Object files are target-specific and therefore need target-specific tool to inspect them. In the case of WebAssembly, the tool is `wasm-objdump`, which is part of the [WebAssembly Binary Toolkit][wabt], or wabt for short.

```bash
$ brew install wabt # in case you haven’t
$ wasm-objdump -x add.o

add.o:  file format wasm 0x1

Section Details:

Type[1]:
 - type[0] (i32, i32) -> i32
Import[3]:
 - memory[0] pages: initial=0 <- env.__linear_memory
 - table[0] elem_type=funcref init=0 max=0 <- env.__indirect_function_table
 - global[0] i32 mutable=1 <- env.__stack_pointer
Function[1]:
 - func[0] sig=0 <add>
Code[1]:
 - func[0] size=75 <add>
Custom:
 - name: "linking"
  - symbol table [count=2]
   - 0: F <add> func=0 binding=global vis=hidden
   - 1: G <env.__stack_pointer> global=0 undefined binding=global vis=default
Custom:
 - name: "reloc.CODE"
  - relocations for section: 3 (Code) [1]
   - R_WASM_GLOBAL_INDEX_LEB offset=0x000006(file=0x000080) symbol=1 <env.__stack_pointer>
```

The output shows that our `add()` function is in this module, but it also contains _custom_ sections filled with metadata and, surprisingly, a couple of imports. In the next phase, called _linking_, the custom sections will be analyzed and removed and the imports will be resolved by the _linker_.

### Linking

Traditionally, the linker’s job is to assembles multiple object file into the _executable_. LLVM’s linker is called `lld`, but it has to be invoked with one of the target-specific symlinks. For WebAssembly there is `wasm-ld`.

```bash
wasm-ld \
  --no-entry \ # We don’t have an entry function
  --export-all \ # Export everything (for now)
  -o add.wasm \
  add.o
```

The output is a 262 bytes WebAssembly module.

### Running it

Of course the most important part is to see that this _actually_ works. [As we did in the previous blog post][raw webassembly], we can use a couple lines of inline JavaScript to load and run this WebAssembly module.

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

The numbers of steps we currently have to do to get from C code to WebAssembly is a bit daunting. As I said, I was bending over backwards for educational purposes. Let’s stop doing that and skip all the human-readable, intermediate formats and use the C compile as the swiss-army knift it was designed to be:

```bash
clang \
  --target=wasm32 \
  -c \
  -Wl,--no-entry \ # flags passed to the linker
  -Wl,--export-all \
  -o add.wasm \
  add.c
```

This will produce the same `.wasm` file as before, but with a single command.

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
  -flto \ # Add metadata for link-time optimizations
  -c \
  -Wl,--no-entry \
  -Wl,--export-all \
  -Wl,--lto-O3 \ # Aggressive link-time optimizations
  -o add.wasm \
  add.c
```

> **Note:** Technically, link-time optimizations don’t bring us any gains here as we are only linking a single file. In bigger projects, LTO will help you keep your file size down.

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

Now, C without the standard library (called “libc”) is pretty rough. It seems logical to look into adding a libc as a next step, but I’m going to be honest: It’s _not_ going to be easy. **I actually won’t link against any libc in this blog post.** There are a couple of libc implementations out there that we could grab, most notably [glibc], [musl] and [dietlibc]. However, most of these libraries expect to run on a POSIX operating system, which implements a specific set of _syscalls_ (calls to the system’s kernel). Since we don’t have a kernel interface in JavaScript, we’d have to implement these POSIX syscalls ourselves, probably by calling out to JavaScript. This is quite the task and I am not going to do that here. The good news is: **This is exactly what [Emscripten] does for you.**

Not all of libc’s functions rely on syscalls, of course. Functions like `strlen()`, `sin()` or even `memset()` are implemented in plain C. That means you could use these functions or even just copy/paste their implementation from one of the libraries above.

## Dynamic memory

With no libc at hand, fundamental C APIs like `malloc()` and `free()` are not available. In our unoptimized WAT above we have seen that the compiler will make use of memory if necessary. That means we can’t just use the memory however we like without risking corruption. We need to understand _how_ that memory is used.

### LLVM’s memory model

The way the WebAssembly memory is segmented is dictated by `wasm-ld` and might take C veterans a bit by surprise. Firstly, address `0` is technically valid in WebAssembly, but will often still be handled as an error case by a lot of C code. Secondly, the stack comes first and grows downwards (towards lower addresses) and the heap cames after and grows upwards. The reason for this is that WebAssembly memory can grow at runtime. That means there is no fixed end to place the stack or the heap at.

The layout that `wasm-ld` uses is the following:

<figure>
  <img src="memlayout.svg" alt="A depiction of the wasm-ld’d memory layout.">
  <figcaption>The stack grows downwards and the heap grows upwards. The stack starts at <code>__data_end</code>, the heap starts at <code>__heap_base</code>. Because the stack is placed first, it is limited to a maximum size set at compile time, which is <code>__heap_base - __data_end</code>.</figcaption>
</figure>

If we look back at the globals section in our WAT we can find these symbols defined. `__heap_base` is 66560 and `__data_end` is 1024. This means that the stack can grow to a maximum of 64KiB, which is _not_ a lot. Luckily, `wasm-ld` allows us to configure this value:

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

We now know that the heap region starts at `__heap_base` and since there is no `malloc()` function, we know that the memory region from there on downwards is ours to control. We can place data in there however we like and don’t have to fear corruption as the stack is growing the other way. Leaving the heap as a free-for-all can get hairy quickly, though, so usually some sort of dynamic memory management is needed. One option is to pull in a full `malloc()` implementation like [Doug Lea’s `malloc` implementation][dlmalloc], which is used by Emscripten today. There is also a couple of smaller implementations with different tradeoffs.

But why don’t we write our own `malloc()`? We are in this deep, we might as well. One of the simplest allocators is a bump allocator. The advantages: It’s super fast, extremely small and simple to implement. The downside: You can’t free memory. While this seems incredibly useless at first sight, I have encountered use-cases while working on [Squoosh] where this would have been an excellent choice. The concept of a bump allocator is that we store the start address of unused memory as a global. If the program requests n bytes of memory, we advance that marker by n and return the previous value:

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

> **Note:** Our bump allocator is not fully compatible with C’s `malloc()`. For example, we don’t make any alignment guarantees. But it’s good enough and it works, so 🤷‍♂️.

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

The `sum()` function is hopefully straight forward. The more interesting question is how we can pass an array from JavaScript to WebAssembly — after all, WebAssembly only understands numbers. The general idea is to use `malloc()` _from JavaScript_ to allocate a chunk of memory, copy the values into that chunk and pass the address (a number!) to _where_ the array is located:

```html
<!DOCTYPE html>

<script type="module">
  async function init() {
    const { instance } = await WebAssembly.instantiateStreaming(
      fetch("./add.wasm")
    );

    const jsArray = [1, 2, 3, 4, 5];
    // Allocate memory for 5 32-bit integers
    // and return get starting address.
    const cArrayPointer = instance.exports.malloc(jsArray.length * 4);
    // Turn that sequence of 32-bit integers
    // into a Uint32Array, starting at that address.
    const cArray = new Uint32Array(
      instance.exports.memory.buffer,
      cArrayPointer,
      jsArray.length
    );
    // Copy the values from JS to C.
    cArray.set(jsArray);
    // Run the function, passing the starting address and length.
    console.log(instance.exports.sum(cArrayPointer, cArray.length));
  }
  init();
</script>
```

When running this you should see a very happy `15` in the DevTools console, which is indeed the sum of all the number from 1 to 5.

## Conclusion

You made it to the end. Congratulations! Again, if you feel a bit overwhelmed, that’s okay: **This is not required reading. You do not need to understand all of this to be a good web developer or even to make good use of WebAssembly.** But I did want to share this journey with you as it really makes you appreciate all the work that a project like [Emscripten] does for you. At the same time, it gave me an understanding of how small purely computational WebAssembly modules can be. The Wasm module for the array summing ended up at just 230 bytes, _including an allocator for dynamic memory_. Compiling the same code with Emscripten would yield 100 bytes of WebAssembly accompanied by 11K of JavaScript glue code. It took a lot of work to get there, but there might be situations where it is worth it.

[emscripten]: https://emscripten.org
[webassembly]: https://webassembly.org
[fopen]: http://man7.org/linux/man-pages/man3/fopen.3.html
[webgl]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
[llvm]: https://llvm.org/
[homebrew]: https://brew.sh/
[raw webassembly]: /things/raw-wasm
[wabt]: https://github.com/WebAssembly/wabt
[glibc]: https://www.gnu.org/software/libc/
[musl]: https://www.musl-libc.org/
[dietlibc]: https://www.fefe.de/dietlibc/
[dlmalloc]: http://g.oswego.edu/dl/html/malloc.html
[squoosh]: https://squoosh.app
