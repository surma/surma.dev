---
title: "Replacing JavaScript with WebAssembly"
date: "2021-02-26"
live: false
# socialmediaimage: "comparison.jpg"
---

Does it really make things faster? Better? Smaller? Stronger? 

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

### Methodology

As described above, it is important to “warm-up” JavaScript when benchmarking, or you end up measuring a mixture of the performance characteristics of interpreted JS and optimized machine code.

|||datatable
{
  data: "./static/things/js-to-asc/results.csv",
  mangle(table) {
    for(const row of table.rows) {
      const runs = row.slice(table.header.length);
      const avg = runs.reduce((sum, c) => sum + parseInt(c), 0) / runs.length;
      row.splice(table.header.length, runs.length, `${avg.toFixed(2)}ms`); 
    }
    table.header.push({name: "Average", classList: ["right"]});
    return table
        .filter(
          {
            program: "blur",
            variant: "naive",
            optimizer: "O3",
            runtime: "incremental"
          },
          {
            program: "blur",
            language: "JavaScript"
          }
        )
        .keepColumns("language", "engine", "average");
  }
}
|||

- ASC is young, small team etc

[AssemblyScript]: https://assemblyscript.org
[Ingvar]: https://twitter.com/rreverser
[glur]: https://github.com/nodeca/glur
[asc stdlib]: https://www.assemblyscript.org/stdlib/globals.html
[compile v8]: https://v8.dev/docs/build
[jsvu]: https://github.com/GoogleChromeLabs/jsvu
[io19 talk]: https://www.youtube.com/watch?v=njt-Qzw0mVY&t=1064s
[webassembly.org]: https://webassembly.org/