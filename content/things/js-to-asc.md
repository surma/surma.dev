---
title: "Replacing JavaScript with WebAssembly"
date: "2021-02-26"
live: false
# socialmediaimage: "comparison.jpg"
---

Does it really make things faster? Better? Smaller? Stronger? 

<!-- more -->

The incredibly unsatisfying answer is: It depends. It depends on oh-so-many factors, and I’ll be touching on _some_ of them here.

## Why am I doing this? (You can skip this)

[AssemblyScript] (ASC for short) is a TypeScript-like language that was designed for and as such compiles to WebAssembly. The “Assembly” in “AssemblyScript” stems from the fact that the languages is very close to the metal of WebAssembly (yes, yes, WebAssembly itself is designed around a VM and not _real_ metal. I know.). AssemblyScript is fairly young with a small team, and so somethings that you might expect do not exist or do not work. Also, full disclosure, I am one of their backers. I think ASC fills an important niche in the WebAssembly ecosystem, as it allows web developers to reap the benefits of WebAssembly without having to learn a new language.

The fact that AssemblyScript is very much TypeScript-like (not just in syntax, but to a large extent also in semantics), I have been thinking about taking a piece of JavaScript and porting it to AssemblyScript to see how this affects performance and file size. When my colleague [Ingvar] happend to send me a [highly-optimized piece of JavaScript][glur] code that blurs images, I decided to run a small experiment to see if this excursion would be worth doing at a larger scale. And _oh boy_ is it worth it.

## Porting to AssemblyScript

AssemblyScript tries to mimick TypeScript semantics and the web platform as much as possible, which means porting a piece of JS to ASC is _mostly_ a matter of adding type annotations. But there is some more nuance to this.

### Adding types

ASC built-in types mirror the types of the WebAssembly VM. While all numeric values in TypeScript are just `number` (a 64-bit IEEE754 float according to the spec), AssemblyScript has `u8`, `u16`, `u32`, `i8`, `i16`, `i32`, `f32` and `f64` as its primitive types. The [small-but-sufficiently-powerful standard library of ASC][asc stdlib] adds higher-level data structures like `string`, `Array<T>`, `ArrayBuffer`, `Uint8Array` etc. The only ASC-specific data structure I am aware of is `StaticArray`, which I will talk about a bit later.

As an example, here is a  function from the glur library and it’s AssemblyScript’ified counterpart:

```js
function gaussCoef(sigma) {
  if (sigma < 0.5)
    sigma = 0.5;

  var a = Math.exp(0.726 * 0.726) / sigma;
  /* ... more math ... */

  return new Float32Array([a0, a1, a2, a3, b1, b2, left_corner, right_corner]);
}
```

```ts
function gaussCoef(sigma: f32): Float32Array {
  if (sigma < 0.5) 
    sigma = 0.5;

  let a: f32 = <f32>Math.exp(0.726 * 0.726) / sigma;
  /* ... more math ... */

  const r = new Float32Array(8);
  const v = [a0, a1, a2, a3, b1, b2, left_corner, right_corner];
  for (let i = 0; i < v.length; i++) {
    r[i] = v[i];
  }
  return r;
}
```

The explicit loop at the end of this function might surprise you. Function overloading isn’t support (yet), so there is only _exactly_ one constructor for `Float32Array`, which takes an `i32` parameter for the lenght of the `TypedArray`. Callbacks are supported in ASC, but closures also are not, so I can’t use `.forEach()` to fill in the values. This is certainly _inconvenient_, but not prohibitively so. 

### Signage

With hindsight it’s obvious, but here’s a mistake I made while porting JS to ASC. Take a look at this loop

```diff
- var j;
+ let j: u32;
for (j = width - 1; j >= 0; j--) {
  // ...
}
```

- Loop mistake

[AssemblyScript]: https://assemblyscript.org
[Ingvar]: https://twitter.com/rreverser
[glur]: https://github.com/nodeca/glur
[asc stdlib]: https://www.assemblyscript.org/stdlib/globals.html