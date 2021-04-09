---
title: "Is WebAssembly magic performance pixie dust?"
date: "2021-04-09"
live: false
# socialmediaimage: "comparison.jpg"
---

Add WebAssembly, get performance? Well, it’s a bit more complicated than that!

<!-- more -->

<link rel="stylesheet" href="/things/js-to-asc/data-table.css" />

The incredibly unsatisfying answer is: It depends. It depends on oh-so-many factors, and I’ll be touching on _some_ of them here.

## Why am I doing this? (You can skip this)

[AssemblyScript] (ASC for short) is a TypeScript-like language that was designed for and as such compiles to WebAssembly. The “Assembly” in “AssemblyScript” stems from the fact that the languages is very close to the metal of WebAssembly (yes, yes, WebAssembly itself is designed around a VM and not _real_ metal. I know.). AssemblyScript is fairly young with a small team, and so somethings that you might expect do not exist or do not work. Also, full disclosure, I am one of their backers. I think ASC fills an important niche in the WebAssembly ecosystem, as it allows web developers to reap the benefits of WebAssembly without having to learn a new language.

The fact that AssemblyScript is very much TypeScript-like (not just in syntax, but to a large extent also in semantics), I have been thinking about taking a piece of JavaScript and porting it to AssemblyScript to see how this affects performance and file size. When my colleague [Ingvar] happend to send me a [highly-optimized piece of JavaScript][glur] code that blurs images, I decided to run a small experiment to see if this excursion would be worth doing at a larger scale. And _oh boy_ is it worth it.

## Why WebAssembly?

Why would WebAssembly be faster than JavaScript? For the longest time, [I have said that WebAssembly and JavaScript have the same peak performance][io19 talk], and I still stand behind that. It’s only recently that WebAssembly has gotten access to performance primitives (like SIMD or shared-memory threads) that JavaScript cannot utilize. But there are other factors that could make WebAssembly faster in certain constellations:

- **No warmup**: For JavaScript to be turned into machine code, it needs to run for a bit first. This is where V8’s interpreter “Ignition” interprets JavaScript and makes observations about what the data in your variables, function parameters and so on looks like. Once sufficient data has been collected, V8’s optimizing compiler “TurboFan” kicks in and generates machine code using that data that will execute the same code a lot faster than Ingnition can. WebAssembly on the other hand is strongly typed, it can be turned into machine code _straight away_. V8 has a streaming Wasm compiler called “Liftoff“ which is optimized to generate machine code _fast_, rather than generating fast machine code. This way your WebAssembly can start running sooner. The second Liftoff is done, TurboFan kicks in and generates optimized machine code that will run faster than what Ignition produced. The big difference is that the TurboFan can do its work without the Wasm ever being run. 
- **No tierdown**: The machine code that TurboFan generates for JavaScript is only usable for as long as the observed types don’t change. If TurboFan generated machine code for a funtion `f` with a number as a parameter, and now all of the sudden that function `f` gets called with an object, the engine has to fall back to interpreting JavaScript using Ignition. That’s called a “deoptimization” (or “deopt” for short) because interpreting code is a lot slower than running machine code on the bare metal. WebAssembly is strongly typed. All variables and functions are not only given types, but they are also types that map well to machine code. Deopts can’t happen with WebAssembly.
- **Binary size**: Now this one is a bit elusive. According to [webassembly.org], “the wasm stack machine is designed to be encoded in a size- and load-time-efficient binary format.” And yet, WebAssembly is currently somewhat notorious for generating big binary blobs, at least by what is considered “big” on the web. WebAssembly brotli’s (and gzip’s) very well and can indeed achieve a high programmatic density. However, despite claims to the opposite, JavaScript comes with a lot of batteries included. You can handle arrays, objects, iterate over keys and values, split strings, filter, map, have prototypical inheritance and so on and so forth. WebAssembly comes with _nothing_, except arithmetic. Whenever you use anything higher level when compiling to WebAssembly, that code will have to be bundled into your binary, which is often referred to as shipping a “runtime”. Of course those functionalities will only have to be included once, so bigger projects will benefit more from Wasm’s small binary representation than small modules.

The question is, which way do these benefits and drawbacks add up in concrete examples? That’s what I want to find out.

## Porting to AssemblyScript

AssemblyScript tries to mimick TypeScript semantics and the web platform as much as possible, which means porting a piece of JS to ASC is _mostly_ a matter of adding type annotations to the code. But there is some more nuance to this.

### Adding types

ASC built-in types mirror the types of the WebAssembly VM. While all numeric values in TypeScript are just `number` (a 64-bit IEEE754 float according to the spec), AssemblyScript has `u8`, `u16`, `u32`, `i8`, `i16`, `i32`, `f32` and `f64` as its primitive types. The [small-but-sufficiently-powerful standard library of ASC][asc stdlib] adds higher-level data structures like `string`, `Array<T>`, `ArrayBuffer`, `Uint8Array` etc. The only ASC-specific data structure I am aware of is `StaticArray`, which I will talk about a bit later.

As an example, here is a  function from the glur library and it’s AssemblyScript’ified counterpart:

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

  let a: f32 = <f32>Math.exp(0.726 * 0.726) / sigma;
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

The explicit loop at the end to populate the array might surprise you. Function overloading isn’t support (yet), so there is only _exactly_ one constructor for `Float32Array` in ASC, which takes an `i32` parameter for the length of the `TypedArray`. Callbacks are supported in ASC, but closures also are not, so I can’t use `.forEach()` to fill in the values. This is certainly _inconvenient_, but not prohibitively so. 

### Side note: Mind the signs

Something that took me an embarrassingly long time to figure out is that, uh, types matter. Blurring an image involves convolution, and that means a whole bunch of for-loops iterating over all the pixels. Näively I thought that pixel indices are all positive and as such chose `u32` for those loop variables. That’ll bit you with a _lovely_ infinite loop if any of those loops happen to iterate backwards, like this one:

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

> **d-What?**: `d8` is a minimal CLI wrapper around V8, exposing fine-grained control over all kinds of engine features for both Wasm and JS. You can think of it like Node, but with no standard library whatsoever. Just vanilla ECMAScript. Unless you have compiled V8 locally (which you _can_ do by following [the guide on v8.dev][compile v8]), you probably won’t have `d8` available. [JSVU] is a project that can install binaries for many JavaScript engines, including V8.

However, since this section has the word “Benchmarking” in the title, I think it’s important to put a disclaimer here: The numbers I am listing here are specific to the code that _I_ wrote in a language _I_ chose, ran on _my_ machine using a benchmark script that _I_ made. The results are coarse indicators _at best_ and it would be ill-advices to derive conclusions about the general performance AssemblyScript, WebAssembly or JavaScript from this.

But why `d8`? Why not Node or just the browser? The reason is that `d8` allows me to control whether TurboFan should be enabled or not. I can force `d8` to continue interpreting JavaScript using Ignition if it had enough data to tier up to TurboFan. With WebAssembly, I can opt-in to longer compilation times and force `d8` to _only_ use TurboFan, skipping the Liftoff phase. 

### Methodology

As described above, it is important to “warm-up” JavaScript when benchmarking, or you end up measuring a mixture of the performance characteristics of interpreted JS and optimized machine code. To that end, I’m running the blur program 5 times before I start measuring, then I do 50 timed runs to eliminate some of the noise and variation and ignore the 5 fastest and slowest runs to remove potential outliers. Here’s what I got:

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
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

This didn’t sit well with me. On the one hand, AssemblyScript is a relatively young project with a small team. Their compiler is single-pass and defers all optimization efforts to [Binaryen] (same optimizer as `wasm-opt`). This means that optimization only happens when a many of the high-level semantics have been compiled away, giving the JavaScript optimizer an edge. But at the same time, the blur code is so simple — just doing arithmetic with values from memory — that I was really surprised to see the WebAssembly variant taking 3 times as long as JavaScript. What’s going on here? Before we dive in, though, what _is_ an interesting insight is that Liftoff’s output is _significantly_ faster than what Ignition or Sparkplug can deliver, making WebAssembly fast instantly where JavaScript needs time to get fast. But from now on, we are going to focus on TurboFan only.

### Digging in

After quickly consulting with some folks from the V8 team and some folks from the AssemblyScript team (thanks [Daniel] and [Max]!), it turns out that one big difference here are “bounds checks” — or the lack thereof. 

With JavaScript, V8 has the luxury of having access to the language semantics as an additional source of information. It can tell you are not just randomly reading values from memory, but you are iterating over an `ArrayBuffer` using a `for ... of` loop. What’s the difference? Well with a `for ... of` loop, the language semantics guarantee that you will never go _out of bounds_. You will never end up accidentally reading element 11 when there is only 10 slots. This means TurboFan does not need to emit bounds checks, which you can think of as `if` statements making sure you are not accessing memory you are not supposed to. Of course, bounds checks take time and are most likely making a big difference here. Luckily, AssemblyScript provides a magic `unchecked()` annotation to indicate that we are taking responsibilty for staying in-bounds.

```diff
- prev_prev_out_r = prev_src_r * coeff[6];
- line[line_index] = prev_out_r;
+ prev_prev_out_r = prev_src_r * unchecked(coeff[6]);
+ unchecked(line[line_index] = prev_out_r);
```

But there’s more: The Typed Arrays (`Uint8Array`, `Float32Array`, ...) offer the same API as they do on the platform, meaning they are merely a view of an underlying raw `ArrayBuffer`. This is good in that the API design is familiar and battle-tested, but due to the lack of high-level optimizations means that every access to a field in the array (like `myFloatArray[23]`) needs to access memory twice: Once to load the pointer to the underlying `ArrayBuffer`, and another to load the value at the right offset. V8, is it can tell that you are accessing the Typed Array but never the underlying buffer, is most likely able to optimize that into a single memory access.

To that end, AssemblyScript provides `StaticArray<T>`, which is mostly equivalent to an `Array<T>` except that it can’t grow. With a fixed length, there is no need keep the Array entity separate from the memory the values are stored in, removing that indirection.

I applied both these optimizations to my “naïve port” and measured again:

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
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

Another thing that the AssemblyScript folks pointed out to me is that the `--optimize` flag is equivalent to `-O3s` which aggressively optimizes for speed, but makes tradeoffs to reduce binary size. `-O3` optimizes for speed and speed only. Having `-O3s` as a default is good in spirit — binary size matters on the web — but is it worth it? At least in this specific example the answer is no: `-O3s` ends up trading laughable amounts of bytes (saving ~30 bytes) for a huge performance penalty:

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
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
        variant: "optimized",
        engine: "Turbofan"
      }
    );
    sanitizer(table);
    table.keepColumns("Language", "Optimizer", "Average", "vs JS");
    return table;
  }
}
|||

One single optimizer flag makes a night-and-day difference, letting AssemblyScript overtake JavaScript _on this specific test case_.

### Bubblesort

To gain some confidence that the image blur example is not just a fluke, I thought I should try this again with a second program. Rather uncreatively, I took a bubblesort implementation off of StackOverflow and ran through the same process. Add types. Run benchmark. Optimize. Run benchmark. Worth nothing that creating the array that’s be bubble-sorted is _not_ part of the benchmarked code path.

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
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

## Allocations

Some of you may have noticed that both these examples have very few or no allocations. V8’s memory management for JavaScript is quite complex and I won’t pretend that I understand it. In WebAssembly, on the other hand, you get a chunk of linear memory and you have to decide how to use it (or rather: the language does). So how does AssemblyScript hold up on this front?

To measure this, I chose to benchmark an implementation of a [binary heap]. Fill the binary heap with 1 million random numbers (curtesy of `Math.random()`) and `pop()` them all back out, checking that the numbers are in increasing order. The process remained the same as above: Make a naïve port of the JS code to ASC, run benchmark, optimize, benchmark again:

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
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

More than 100x slower than JavaScript?! Surely, there is something else going on here.

### Runtimes

All data that we create in AssemblyScript needs to be stored in memory. To make sure we don’t overwrite anything else that is already in memory, there is memory management. To provide a familiar environment, AssemblyScript aims to mirror the behavior and semantics of JavaScript as closely as possible. So by default, AssemblyScript adds a fully managed garbage collector to your WebAssembly module so that you don’t have to worry about when to allocate and freeing up memory.

By default, AssemblyScript ships with a [Two-Level Segregated Fit memory allocator][tlsf] and a Incremental Tri-Color Mark & Sweep (ITCMS) garbage collector. The exact kind of allocator and garbage collector don’t really matter, I just found it interesting that you can also go [look at them][asc runtime]. The default runtime, called `incremental`, is also surprisingly small, adding only about 2KB of gzip’d Wasm overhead. AssemblyScript also offers alternative runtimes, namely `minimal` and `stub` that can be chosen using the `--runtime` flag. `minimal` uses the same allocator, but a more lightweight GC that does _not_ run automatically but must be manually invoked. This could be interesting for high-performance use-cases like games where long pauses due to GC are potentially unacceptable. `stub` is _extremely_ small (~400B gzip’d) and fast, as it’s just a [bump allocator]. The downside is that you can’t free up memory. Once it’s allocated, it’s gone (you can call `memory.reset()` to discard the entire heap). For specific single-purpose, one-off modules, this can actually be really handy.

How much faster does that make our binary heap experiment? Quite significantly!

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
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

- Add pre-sorting
- Inspect Array impl


|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  requires: ["./static/things/js-to-asc/sanitizer.js"],
  mangle(table, sanitizer) {
    sanitizer(table);
    return table;
  },
  interactive: true
}
|||

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