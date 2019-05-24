---json
{
  "title": "Compiling C to WebAssembly without Emscripten",
  "date": "2019-05-24",
  "socialmediaimage": "social.png"
}
---

[Emscripten] is _more_ than just a C compiler for [WebAssembly]. How can we use the raw compiler, without all the bells and whistles? 
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

Let’s bend over backwards a bit to make this happen and use the human-readable formats as much as possible. Our program of choice for this is going to be a simple as possible: A C program that has makes no use of C’s standard library or any nun-number data types:

```c
// Filename: add.c
int add(int a, int b) {
  return a*a + b;
}
```

What a mind-boggling feat of engineering! Especially because it’s called “add” but doesn’t actually add.

> **Note**: We’ll be looking at raw WebAssembly here. If you are struggling, that is no problem. **This part is not really required reading!**. But I did write an intorduction to [Raw Webassembly][raw webassembly] and WAT previously!

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

And as a result we get `add.ll` containing the LLVM IR. **I’m only showing it here for completeness sake**. When working with WebAssembly, or even with `clang` when developing C, you _never_ get into contact with LLVM IR. 

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

The next step is invoking LLVMs backend compiler `llc` to turn the LLVM IR into an object file containing a mixture of WebAssembly byte-code and additional metadata:

```bash
llc \
  -march=wasm32 \ # Target WebAssembly
  -filetype=obj \ # Output an object file
  add.ll
```

Our output is a _object file_ called `add.o`, that is now ready for the final stage: Linking.

> **Note**: If we omitted `-filetype=obj` we’d get LLVM’s S-Expression format for WebAssembly, which is human-readable and somewhat similar to WAT. However, the tool that can consume these files, `llvm-mc`, is not fully fleshed out yet and often fails to consume the output of `llc`.

### Linking

Each platform handles linking differently, so there is no one tool for linking in LLVM. For WebAssembly, there is `wasm-ld`. The linker assembles multiple, individual object file into the final _executable_:

```bash
wasm-ld \
  --no-entry \ # We don’t have an entry function
  --export-all \ # Export everything (for now)
  -o add.wasm \
  add.o
```

We have successfully emerged with a `.wasm` file! To look at it in the more familiar WAT format by using `wasm2wat`:

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

Wowza that’s _a lot_ of WAT. There’s memory being used, 8 local variables and a couple of globals. Most of these things are there because we didn’t have any optimizations enabled. We could go in now and add those, but first let’s simplify our compile steps. Going via human-readable LLVM IR is definitely unnecessary and I just did that for educational purposes.

### Running it

Of course, we still need to see that this _actually_ works. [As we did previously][raw webassembly], a simple HTML file will do:

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

If nothing went wrong, you shoud see a `17` in your DevTool’s console (remember, the `add()` function does not just add numbers).

## Compiling C the slightly less hard way

The amount of steps we currently have to do to get from C code to WebAssembly is a bit much — and as I said, it was artificially inflated for educational purposes.
We can skip all the human-readable formats and use the C compiler as it was intended: To create object files from C code.

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

Much better. Now this will still generate a lot of WAT for this simple program. The biggest improvements you can get is by enabled the compiler’s and linker’s optimizer:

```bash
clang \
  --target=wasm32 \
  -O3 \ # Agressive optimizations 
  -c \
  add.c

wasm-ld \
  -o lol.wasm \
  --no-entry \
  --export-all \
  --lto-O3 \ # Aggressive link-time optimizations
  lol.o
```

Our `.wasm` file i

[Emscripten]: https://emscripten.org
[WebAssembly]: https://webassembly.org
[fopen]: http://man7.org/linux/man-pages/man3/fopen.3.html
[WebGL]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
[LLVM]: https://llvm.org/
[homebrew]: https://brew.sh/
[raw webassembly]: /things/raw-webassembly