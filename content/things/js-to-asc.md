---
title: "Is WebAssembly magic performance pixie dust?"
date: "2021-04-12"
live: false
socialmediaimage: "social.png"
---

Add WebAssembly, get performance? Is that how it really works?

<!-- more -->

<link rel="stylesheet" href="/things/js-to-asc/data-table.css" />

The incredibly unsatisfying answer is: It depends. It depends on oh-so-many factors, and I’ll be touching on _some_ of them here.

## Why am I doing this? (You can skip this)

I really like [AssemblyScript] (full disclosure: I am one of their backers). It’s a very young language with a small but passionate team that built a custom compiler for a TypeScript-like language targeting WebAssembly. The reason I like AssemblyScript (or ASC for short) is because it allows the average web developer to make use of WebAssembly without having to learn a potentially new language like C++ or Rust. It’s important to note that the language is TypeScript-_like_. Don’t expect your existing TypeScript code to just compile out of the box. That being said, the language is intentionally mirroring the behaviors and semantics of TypeScript (and therefore JavaScript), which means that the act of “porting” TypeScript to AssemblyScript are often mostly cosmetic, usually just adding type annotations. 

I always wondered if there is anything to gain from taking a piece of JavaScript, turning it into AssemblyScript and compiling it to WebAssembly. When my colleague [Ingvar] sent me a [piece of JavaScript][glur] code to blur images, I thought that this would be a perfect case study. I ran a quick experiment to see if it’s worth doing a deeper exploration into porting JavaScript to AssemblyScript. And _oh boy_ was it worth it. This article is that deeper exploration.

If you want to know more about AssemblyScript, go to the [website][assemblyscript], join the [Discord][asc discord] or, if you fancy, watch the [AssemblyScript intro video][asc video] I made with my podcast husband [Jake].

## Advantages of WebAssembly

In my perception, a lot of people think of WebAssembly purely as a performance primitive. It’s compiled, so it’s gotta be fast, right? Well, for the longest time [I have been vocal that WebAssembly and JavaScript have the same _peak_ performance][io19 talk], and I still stand behind that. Given ideal conditions, they both compile to machine code and end up being equally fast. But there’s obviously more nuance here, and when have conditions _ever_ been ideal on the web‽ Instead, I think it would be better if we thought about WebAssembly as a way to get _predictable_ performance.

However, it’s also important to realize that WebAssembly has recently been getting access to performance primitives (like SIMD or shared-memory threads) that JavaScript cannot utilize, giving WebAssembly a _potential_ edge to predictably out-perform JavaScript. There are also some other qualities of WebAssembly that might make it better suited in specific situations than JavaScript:

### No warmup

When V8 gets given JavaScript, it is first given to the interpreter “Ignition”. It is optimized to make code run as _soon_ as possible. Meanwhile, “Sparkplug” takes Ignitions output (called “byte code”) and turns it into machine code, yielding better performance at the cost of increased memory footprint. While your code is running (either through Ignition or Sparkplug), it is closely observed by V8. It takes note of what kind of type of data you store in your variables, function parameters and so on. Once sufficient data has been collected, V8’s optimizing compiler “TurboFan” kicks in and generates low-level machine code that is optimized for those types. This will give another significant speed boost.

WebAssembly, on the other hand, is strongly typed. It can be turned into machine code _straight away_. V8 has a streaming Wasm compiler called “Liftoff“ which, like Ignition, is geared to get your code running _quickly_, at the cost of generating potentially suboptimal execution speed. The second Liftoff is done, TurboFan kicks in and both generates optimized machine code that will run faster than what Liftoff produced, but will take  longer to generate. The big difference to JavaScript is that the TurboFan can do its work without having to observe your Wasm first.

### No tierdown

The machine code that TurboFan generates for JavaScript is only usable for as long as the assumptions about types hold. If TurboFan generated machine code for a funtion `f` with a number as a parameter, and now all of the sudden that function `f` gets called with an object, the engine has to fall back to Ignition or Sparkplug. That’s called a “deoptimization” (or “deopt” for short). Again, because WebAssembly is strongly typed, the types _can’t_ change. Not only that, but the types that WebAssembly supports are designed to map well to machine code. Deopts can’t happen with WebAssembly.

### Binary size

Now this one is a bit elusive. According to [webassembly.org], “the wasm stack machine is designed to be encoded in a size- and load-time-efficient binary format.” And yet, WebAssembly is currently somewhat notorious for generating big binary blobs, at least by what is considered “big” on the web. WebAssembly compresses very well (via gzip or brotli), which can undo a lot of the bloat. 

It is easy to forget that JavaScript comes with a lot of batteries included (despite the claim that it doesn’t have a standard library). For example: You can handle arrays, objects, iterate over keys and values, split strings, filter, map, have prototypical inheritance and so on and so forth. All that is built into the JavaScript engine. WebAssembly comes with _nothing_, except arithmetic. Whenever you use any of these higher-level concepts in a language that compiles to WebAssembly, the underpinning code will have to get bundled into your binary, which is one of the causes for big WebAssembly binaries. Of course those functions will only have to be included once, so bigger projects will benefit more from Wasm’s small binary representation than small modules.

Not all of these advantages are equally available or important in any given scenario. However, AssemblyScript is known to generate rather small WebAssembly binaries and I was curious how it can hold up in terms of speed and size with _directly_ comparable JavaScript.

## Porting to AssemblyScript

As mentioned, AssemblyScript mimics TypeScript’s semantics and Web Platform APIs as much as possible, which means porting a piece of JS to ASC is _mostly_ a matter of adding type annotations to the code. As a first example, I took [`glur`][glur], a JavaScript library that blurs images. 

### Adding types

ASC’s built-in types mirror the types of the WebAssembly VM. While numeric values in TypeScript are just `number` (a 64-bit [IEEE754] float according to the spec), AssemblyScript has `u8`, `u16`, `u32`, `i8`, `i16`, `i32`, `f32` and `f64` as its primitive types. The [small-but-sufficiently-powerful standard library of ASC][asc stdlib] adds higher-level data structures like `string`, `Array<T>`, `ArrayBuffer`, `Uint8Array` etc. The only ASC-specific data structure, that is neither in JavaScript nor the Web Platform, is `StaticArray`, which I will talk about a bit later.

As an example, here is a function from the glur library and its AssemblyScript’ified counterpart:

```js
function gaussCoef(sigma) {
  if (sigma < 0.5)
    sigma = 0.5;

  var a = Math.exp(0.726 * 0.726) / sigma;
  /* ... more math ... */

  return new Float32Array([
    a0, a1, a2, a3, 
    b1, b2, 
    left_corner, right_corner
  ]);
}
```

```ts
function gaussCoef(sigma: f32): Float32Array {
  if (sigma < 0.5) 
    sigma = 0.5;

  let a: f32 = Mathf.exp(0.726 * 0.726) / sigma;
  /* ... more math ... */

  const r = new Float32Array(8);
  const v = [
    a0, a1, a2, a3, 
    b1, b2, 
    left_corner, right_corner
  ];
  for (let i = 0; i < v.length; i++) {
    r[i] = v[i];
  }
  return r;
}
```

The explicit loop at the end to populate the array is there because of a current short-coming in AssemblyScript: Function overloading isn’t support yet. There is only _exactly_ one constructor for `Float32Array` in ASC, which takes an `i32` parameter for the length of the `TypedArray`. Callbacks are supported in ASC, but closures also are not, so I can’t use `.forEach()` to fill in the values. This is certainly _inconvenient_, but not prohibitively so. 

> **Mathf**: You might have noticed `Mathf` instead of `Math`. `Mathf` is specifically for 32-bit floats, while `Math` is for 64-bit floats. I could have used `Math` and do a cast, but they are ever-so-slightly slower due to the increased precision required. Either way, the `gaussCoef` function is not part of the hot path, so it really doesn’t make a difference.

### Side note: Mind the signs

Something that took me an embarrassingly long time to figure out is that, uh, types matter. Blurring an image involves convolution, and that means a whole bunch of for-loops iterating over all the pixels. Naïvely I thought that because all pixel indices are positive, the loop counters would be as well and decided to choose `u32` for those loop variables. That’ll bite you with a _lovely_ infinite loop if any of those loops happen to iterate backwards, like the following one:

```ts
let j: u32; 
// ... many many lines of code ...
for (j = width - 1; j >= 0; j--) {
  // ...
}
```

Apart from that, the act of porting JS to ASC was a pretty mechanical task.

### Benchmarking using d8

Now that we have a JS file and an ASC file, we can compile the ASC to WebAssembly and run a little benchmark to compare the runtime performance.

> **d-What?**: `d8` is a minimal CLI wrapper around V8, exposing fine-grained control over all kinds of engine features for both Wasm and JS. You can think of it like Node, but with no standard library whatsoever. Just vanilla ECMAScript. Unless you have compiled V8 locally (which you _can_ do by following [the guide on v8.dev][compile v8]), you probably won’t have `d8` available. [jsvu] is a tool that can install pre-compiled binaries for many JavaScript engines, including V8.

However, since this section has the word “Benchmarking” in the title, I think it’s important to put a disclaimer here: The numbers I am listing here are specific to the code that _I_ wrote in a language _I_ chose, ran on _my_ machine (a 2020 M1 MacBook Air) using a benchmark script that _I_ made. The results are coarse indicators _at best_ and it would be ill-advised to derive quantitative conclusions about the general performance AssemblyScript, WebAssembly or JavaScript from this.

Some might be wondering why I’m using `d8` instead running this in the browser or even Node. Both Node and the browser have,... other stuff that may or may not screw with the results. `d8` is the most sterile environment I can get and as a cherry on top it allows me to control the tier-up behavior. I can limit execution to use Ignition, Sparkplug or Liftoff only, ensuring that performance characteristics don’t change in the middle of a benchmark.

### Methodology

As described above, it is important to “warm-up” JavaScript when benchmarking, giving V8 a chance to optimize it. If you don’t do that, you may very well end up measuring a mixture of the performance characteristics of interpreted JS and optimized machine code. To that end, I’m running the blur program 5 times before I start measuring, then I do 50 timed runs and ignore the 5 fastest and slowest runs to remove potential outliers. Here’s what I got:

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
  sortable: true,
  sort: ["vs JS", "descending"],
  mangle(table, sanitizer) {
    table
        .filter(
          {
            program: "blur",
            variant: "naive",
            optimizer: "O3s",
            runtime: "incremental"
          },
          {
            program: "blur",
            language: "JavaScript"
          }
        );
    sanitizer(table);

    table.keepColumns("Language", "Engine", "Average", "vs JS");
    return table;
  }
}
|||

On the one hand, I was happy to see that Liftoff’s output was faster than what Ignition or Sparkplug could squeeze out of JavaScript. At the same time, it didn’t sit well with me that the optimized WebAssembly module takes about 3 times as long as JavaScript. 

To be fair, this is a David vs Goliath scenario: V8 is a long-standing JavaScript engine with a huge team of engineers implementing optimizations and other clever stuff, while AssemblyScript is a relatively young project with a small team around it. ASC’s compiler is single-pass and defers all optimization efforts to [Binaryen] (see also: `wasm-opt`). This means that optimization is done at the Wasm VM byte code level, after most of the high-level semantics have been compiled away. V8 has a clear edge here. However, the blur code is so simple — just doing arithmetic with values from memory — that I was really expecting it to be closer. What’s going on here? 

### Digging in

After quickly consulting with some folks from the V8 team and some folks from the AssemblyScript team (thanks [Daniel] and [Max]!), it turns out that one big difference here are “bounds checks” — or the lack thereof. 

V8 has the luxury of having access to your original JavaScript code and knowledge about the semantics of the language. It can use that information to apply additional optimizations. For example: It can tell you are not just randomly reading values from memory, but you are iterating over an `ArrayBuffer` using a `for ... of` loop. What’s the difference? Well with a `for ... of` loop, the language semantics guarantee that you will never try to read values outside of the `ArrayBuffer`. You will never end up accidentally reading byte 11 when the buffer is only 10 bytes long, or: You never go _out of bounds_. This means TurboFan does not need to emit bounds checks, which you can think of as `if` statements making sure you are not accessing memory you are not supposed to. This kind of information is lost once compiled to WebAssembly, and since ASC’s optimization only happens at WebAssembly VM level, it can’t necessarily apply the same optimization.

Luckily, AssemblyScript provides a magic `unchecked()` annotation to indicate that we are taking responsibilty for staying in-bounds.

```diff
- prev_prev_out_r = prev_src_r * coeff[6];
- line[line_index] = prev_out_r;
+ prev_prev_out_r = prev_src_r * unchecked(coeff[6]);
+ unchecked(line[line_index] = prev_out_r);
```

But there’s more: The Typed Arrays in AssemblyScript (`Uint8Array`, `Float32Array`, ...) offer the same API as they do on the platform, meaning they are merely a view onto an underlying `ArrayBuffer`. This is good in that the API design is familiar and battle-tested, but due to the lack of high-level optimizations, this means that every access to a field on the Typed Array (like `myFloatArray[23]`) needs to access memory twice: Once to load the pointer to the underlying `ArrayBuffer` of this specific array, and another to load the value at the right offset. V8, as it can tell that you are accessing the Typed Array but never the underlying buffer, is most likely able to optimize the entire data structure so that you can read  values with a single memory access.

For that reason, AssemblyScript provides `StaticArray<T>`, which is mostly equivalent to an `Array<T>` except that it can’t grow. With a fixed length, there is no need keep the Array entity separate from the memory the values are stored in, removing that indirection.

I applied both these optimizations to my “naïve port” and measured again:

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
  sortable: true,
  sort: ["vs JS", "ascending"],
  mangle(table, sanitizer) {
    table.filter(
      {
        program: "blur",
        language: "JavaScript",
        engine: "Turbofan"
      },
      {
        program: "blur",
        language: "AssemblyScript",
        optimizer: "O3s",
        runtime: "incremental",
        engine: "Turbofan"
      }
    );
    sanitizer(table);
    table.keepColumns("Language", "Variant", "Average", "vs JS");

    return table;
  }
}
|||

A lot better! While the AssemblyScript is still slower than the JavaScript, we got significantly closer. Is this the best we can do?

### Sneaky defaults

Another thing that the AssemblyScript folks pointed out to me is that the `--optimize` flag is equivalent to `-O3s` which aggressively optimizes for speed, but makes tradeoffs to reduce binary size. `-O3` optimizes for speed and speed only. Having `-O3s` as a default is good in spirit — binary size matters on the web — but is it worth it? At least in this specific example the answer is no: `-O3s` ends up trading the laughable amount of ~30 bytes for a huge performance penalty:

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
  sortable: true,
  sort: ["vs JS", "ascending"],
  mangle(table, sanitizer) {
    table.filter(
      {
        program: "blur",
        language: "JavaScript",
        engine: "Turbofan"
      },
      {
        program: "blur",
        language: "AssemblyScript",
        runtime: "incremental",
        optimizer: "O3s",
        variant: "naive",
        engine: "Turbofan"
      },
      {
        program: "blur",
        language: "AssemblyScript",
        runtime: "incremental",
        variant: "optimized",
        engine: "Turbofan"
      }
    );
    sanitizer(table);
    table.keepColumns("Language", "Variant", "Optimizer", "Average", "vs JS");
    return table;
  }
}
|||

One single optimizer flag makes a night-and-day difference, letting AssemblyScript overtake JavaScript (on this specific test case!). We made AssemblyScript faster than JavaScript!

> **O3**: From here on forward, I will only be using `-O3` in this article.

### Bubblesort

To gain some confidence that the image blur example is not just a fluke, I thought I should try this again with a second program. Rather uncreatively, I took a bubblesort implementation off of StackOverflow and ran through the same process: Add types. Run benchmark. Optimize. Run benchmark. The creation and population of the array that’s to be bubble-sorted is _not_ part of the benchmarked code path.

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
  sortable: true,
  filterable: true,
  sort: ["vs JS", "ascending"],
  mangle(table, sanitizer) {
    table.filter(
      {
        program: "bubblesort",
        language: "JavaScript",
      },
      {
        program: "bubblesort",
        language: "AssemblyScript",
        runtime: "incremental",
        optimizer: "O3"
      }
    );
    sanitizer(table);
    table.keepColumns("Language", "Variant", "Engine", "Average", "vs JS");

    return table;
  }
}
|||

We did it again! This time with an even bigger discrepancy: The optimized AssemblyScript is almost twice as fast as JavaScript. But do me a favor: Don’t stop reading now.

## Allocations

Some of you may have noticed that both these examples have very few or no allocations. V8 takes care of all memory management (and garbage collection) in JavaScript for you and I won’t pretend that I know much about it. In WebAssembly, on the other hand, you get a chunk of linear memory and you have to decide how to use it (or rather: the language does). How much do these rankings change if we make _heavy_ use of dynamic memory?

To measure this, I chose to benchmark an implementation of a [binary heap]. The benchmark fils the binary heap with 1 million random numbers (curtesy of `Math.random()`) and `pop()`s them all back out, checking that the numbers are in increasing order. The process remained the same as above: Make a naïve port of the JS code to ASC, run benchmark, optimize, benchmark again:

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
  sortable: true,
  filterable: true,
  sort: ["vs JS", "ascending"],
  mangle(table, sanitizer) {
    table.filter(
      {
        program: "binaryheap",
        language: "JavaScript",
      },
      {
        program: "binaryheap",
        language: "AssemblyScript",
        runtime: "incremental",
        variant: ["naive", "optimized"],
        optimizer: "O3"
      }
    );
    sanitizer(table);
    table.keepColumns("Language", "Variant", "Engine", "Average", "vs JS");
    return table;
  }
}
|||

80x slower than JavaScript?! Even slower than Ignition? Surely, there is something else going wrong here.

### Runtimes

All data that we create in AssemblyScript needs to be stored in memory. To make sure we don’t overwrite anything else that is already in memory, there is memory management. As AssemblyScript aims to provide a familiar environment, mirroring the behavior of JavaScript, it adds a fully managed garbage collector to your WebAssembly module so that you don’t have to worry about when to allocate and when to free up memory.

By default, AssemblyScript ships with a [Two-Level Segregated Fit memory allocator][tlsf] and an [Incremental Tri-Color Mark & Sweep (ITCMS)][itcms] garbage collector. It’s not actually relevant for this article what kind of allocator and garbage collector they use, I just found it interesting that you can go [look at them][asc runtime]. 

This default runtime, called `incremental`, is surprisingly small, adding only about 2KB of gzip’d WebAssembly to your module. AssemblyScript also offers alternative runtimes, namely `minimal` and `stub` that can be chosen using the `--runtime` flag. `minimal` uses the same allocator, but a more lightweight GC that does _not_ run automatically but must be manually invoked. This could be interesting for high-performance use-cases like games where you want to be in control when the GC will pause your program. `stub` is _extremely_ small (~400B gzip’d) and fast, as it’s just a [bump allocator].

> **My lovely memory bump**: Bump allocators are _extrelemy_ fast, but lack the ability to free up memory. While that sounds stupid, it can be extremely useful for single-purpose modules, where instead of freeing memory, you delete the entire WebAssembly instance and rather create a new one. If you are curious, I actually wrote a bump allocator in my article [Compiling C to WebAssembly without Emscripten][c to webassembly].

How much faster does that make our binary heap experiment? Quite significantly!

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
  sortable: true,
  sort: ["vs JS", "ascending"],
  mangle(table, sanitizer) {
    table.filter(
      {
        program: "binaryheap",
        language: "JavaScript",
        engine: "Turbofan"
      },
      {
        program: "binaryheap",
        language: "AssemblyScript",
        variant: "optimized",
        optimizer: "O3",
        engine: "Turbofan"
      }
    );
    sanitizer(table);
    table.keepColumns("Language", "Variant", "Runtime", "Average", "vs JS");
    return table;
  }
}
|||

Both `minimal` and `stub` get us _significantly_ closer to JavaScripts performance. But _why_ are these two so much faster? As mentioned above, `minimal` and `incremental` share the same allocator, so that can’t be it. Both also have a garbage collector, but `minimal` doesn’t run it unless explicitly invoked (and we ain’t invoking it). That means the differentiating quality is that `incremental` _runs_ garbage collection, while `minimal` and `stub` do not. I don’t see why the garbage collector should make this big of a difference, considering it has to keep track of _one_ array.

### Growth

After doing some [profiling with d8] on a build with debugging symbols (`--debug`), it turns out that a lot of time is spent in a system library `libsystem_platform.dylib`, which contains OS-level primitives for threading and memory management. Calls into this library are made from `__new` and `__renew`, which in turn are called from `Array<f32>#push`:
```
[Bottom up (heavy) profile]:
  ticks parent  name
  18670   96.1%  /usr/lib/system/libsystem_platform.dylib
  13530   72.5%    Function: *~lib/rt/itcms/__renew
  13530  100.0%      Function: *~lib/array/ensureSize
  13530  100.0%        Function: *~lib/array/Array<f32>#push
  13530  100.0%          Function: *binaryheap_optimized/BinaryHeap<f32>#push
  13530  100.0%            Function: *binaryheap_optimized/push
   5119   27.4%    Function: *~lib/rt/itcms/__new
   5119  100.0%      Function: *~lib/rt/itcms/__renew
   5119  100.0%        Function: *~lib/array/ensureSize
   5119  100.0%          Function: *~lib/array/Array<f32>#push
   5119  100.0%            Function: *binaryheap_optimized/BinaryHeap<f32>#push
```

Clearly, we have a problem with allocations here. But JavaScript somehow manages to make an ever-growing array fast, so why can’t AssemblyScript? Luckily, the standard library of AssemblyScript is rather small and approachable, so let’s go and [take a look][array push impl] at this ominous `push()` function of the `Array<T>` class:

```ts
export class Array<T> {
  // ...
  push(value: T): i32 {
    var length = this.length_;
    var newLength = length + 1;
    ensureSize(changetype<usize>(this), newLength, alignof<T>());
    // ...
    return newLength;
  }
  // ...
}
```

The `push()` function correctly determines that the new length of the array is the current length plus 1 and then calls `ensureSize()`, to make sure that the underlying buffer has enough room (“capacity”) to grow to this length.

```ts
function ensureSize(array: usize, minSize: usize, alignLog2: u32): void {
  // ...
  if (minSize > <usize>oldCapacity >>> alignLog2) {
    // ...
    let newCapacity = minSize << alignLog2;
    let newData = __renew(oldData, newCapacity);
    // ... 
  }
}
```

`ensureSize()`, in turn, checks if the capacity is smaller than the new `minSize`, and if so, allocates a new buffer of size  `minSize` using `__renew`, which entails copying all the data from the old buffer to the new buffer. For that reason our benchmark, where we push _one million values_ one-by-one into the array, ends up causing a _lot_ of allocation work and create a lot of garbage. 

In other languages, like [Rust’s `std::vec`][rust impl] or [Go’s slices][go impl], the new buffer has _double_ the old buffer’s capacity, which amortizes the allocation work over time. [I am working to fix this in ASC][asc issue], but in the meantime we can create our own `CustomArrow<T>` that has the desired behavior. Lo and behold, we made things faster!

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
  sortable: true,
  filterable: true,
  sort: ["vs JS", "ascending"],
  mangle(table, sanitizer) {
    table.filter(
      {
        program: "binaryheap",
        language: "JavaScript",
        engine: "Turbofan"
      },
      {
        program: "binaryheap",
        language: "AssemblyScript",
        runtime: ["incremental", "minimal", "stub"],
        variant: ["optimized", "customarray"],
        optimizer: "O3",
        engine: "Turbofan"
      }
    );
    sanitizer(table);
    table.keepColumns("Language", "Variant", "Runtime", "Average", "vs JS");
    return table;
  }
}
|||

With this change `incremental` is as fast as `stub` and `minimal`, but none of them are as fast as JavaScript in this test case. There are probably more optimizations I could do, but we are already pretty deep in the weeds here, and this is not supposed to be an article about how to optimize AssemblyScript. 

There are also a lot of simple optimizations I wish AssemblyScript’s _compiler_ would do for me. To that end, they are working on an [IR] called “AIR”. Will that make things faster out-of-the-box without having to hand-optimize every array access? Very likely. Will it be faster than JavaScript? Hard to say. But I _did_ wonder what the more “mature” languages with “very smart” compiler toolchains can achieve.

### Rust & C++

I re-rewrote the code in Rust, being as idiomatic as possible and compiled it to WebAssembly. While it was faster than a naive port to AssemblyScript, it was slower than our optimized AssemblyScript with `CustomArray<T>`. So I had to do the same as I did in AssemblyScript: Avoid bound checks by sprinkling some `unsafe` here and there. With that optimization in place, Rust’s WebAssembly module is faster than our optimized AssemblyScript, but still not faster than JavaScript.

I took the same approach with C++, using [Emscripten] to compile it to WebAssembly. To my surprise, my first attempt came out performing just as well as JavaScript.

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
  sortable: true,
  sort: ["vs JS", "ascending"],
  mangle(table, sanitizer) {
    table.filter(
      {
        program: "binaryheap",
        language: "JavaScript",
        engine: "Turbofan"
      },
      {
        program: "binaryheap",
        language: "AssemblyScript",
        runtime: "incremental",
        variant: "customarray",
        optimizer: "O3",
        engine: "Turbofan"
      },
      {
        program: "binaryheap",
        language: "Rust",
        engine: "Turbofan"
      },
      {
        program: "binaryheap",
        language: "C++",
        engine: "Turbofan"
      }
    );
    sanitizer(table);
    table.keepColumns("Language", "Variant", "Average", "vs JS");
    return table;
  }
}
|||

I’m sure both Rust and C++ could be made even faster, but I don’t know have sufficently deep knowledge of either language to squeeze out those last couple optimizations. 

### Gzip’d file sizes

It is worth noting that file size is a _strength_ of AssemblyScript. Comparing the gzip’d file sizes, we get:

|||datatable
{
  data: "./static/things/js-to-asc/filesizes.csv",
  sort: ["Total", "ascending"],
  mangle(table) {
    table.setFormatter(".wasm", v => v > 1024 ? `${(v/1024).toFixed(1)}KB` : `${v} B`);
    table.setFormatter(".js", v => v > 1024 ? `${(v/1024).toFixed(1)}KB` : `${v} B`);
    table.addColumn(
      "Total",
      table.header.length,
      (row, i) => parseInt(row[2]) + parseInt(row[3]),
      v => v > 1024 ? `${(v/1024).toFixed(1)}KB` : `${v} B`
    );
    return table;
  }
}
|||

## Conclusion

I want to be very clear: Any generalized, quantitative take-away from this article would be ill-advised. For example, Rust is _not_ 1.2x slower than JavaScript. These number are very much specific to the code that _I_ wrote, the optimizations that _I_ applied and the machine _I_ used. However, I think there are some general guidelines we can extract to help you make more informed decisions in the future:

- V8’s Liftoff compiler will generate code from WebAssembly that runs significantly faster thant what Ignition or SparkPlug can deliver for JavaScript. If you need performance without _any_ warmup time, WebAssembly is your tool of choice.
- V8 is _really_ good at executing JavaScript. While WebAssembly can run faster than JavaScript, it is likely that you will have to hand-optimize your code to achieve that.
- Compilers can do a lot of work for you, more mature compilers are likely to be better at optimizing your code.
- AssemblyScript modules tend to be a lot smaller.

If you don’t trust me (and you shouldn’t!) and want to dig into the benchmark code yourself, take a look at the [gist].

[AssemblyScript]: https://assemblyscript.org
[Ingvar]: https://twitter.com/rreverser
[glur]: https://github.com/nodeca/glur
[asc stdlib]: https://www.assemblyscript.org/stdlib/globals.html
[compile v8]: https://v8.dev/docs/build
[jsvu]: https://github.com/GoogleChromeLabs/jsvu
[io19 talk]: https://www.youtube.com/watch?v=njt-Qzw0mVY&t=1064s
[webassembly.org]: https://webassembly.org/
[binaryen]: https://github.com/WebAssembly/binaryen
[daniel]: https://twitter.com/dcodeio
[max]: https://twitter.com/maxgraey
[binary heap]: https://en.wikipedia.org/wiki/Binary_heap
[tlsf]: http://www.gii.upv.es/tlsf/
[itcms]: https://en.wikipedia.org/wiki/Tracing_garbage_collection#Tri-color_marking
[asc runtime]: https://github.com/AssemblyScript/assemblyscript/tree/master/std/assembly/rt
[bump allocator]: https://os.phil-opp.com/allocator-designs/#bump-allocator
[profiling with d8]: https://v8.dev/docs/profile
[array push impl]: https://github.com/AssemblyScript/assemblyscript/blob/42c2dbc987c2e9f4096a226b62bbf0e72b4a0e51/std/assembly/array.ts#L204-L216
[asc issue]: https://github.com/AssemblyScript/assemblyscript/issues/1798
[rust impl]: https://github.com/rust-lang/rust/blob/58f32da346642ff3f50186f6f4a0de46e61008be/library/alloc/src/raw_vec.rs#L431
[go impl]: https://github.com/golang/go/blob/3f4977bd5800beca059defb5de4dc64cd758cbb9/src/runtime/slice.go#L144-L163
[IR]: https://en.wikipedia.org/wiki/Intermediate_representation
[emscripten]: https://emscripten.org/
[asc discord]: https://discord.gg/assemblyscript
[asc video]: https://www.youtube.com/watch?v=u0Jgz6QVJqg
[ensuresize impl]: https://github.com/AssemblyScript/assemblyscript/blob/42c2dbc987c2e9f4096a226b62bbf0e72b4a0e51/std/assembly/array.ts#L10-L26
[gist]: https://gist.github.com/surma/40e632f57a1aec4439be6fa7db95bc88
[jake]: https://twitter.com/jaffathecake
[ieee754]: https://en.wikipedia.org/wiki/IEEE_754
[c to webassembly]: /things/c-to-webassembly/index.html