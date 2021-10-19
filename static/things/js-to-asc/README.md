This is a benchmark comparing JavaScript libraries with a port to [AssemblyScript]. AssemblyScript is a TypeScript-like language that compiles to WebAssembly, so the process of porting consisted merely of adding some type annotation and type casts (see `diff -y blur.js blur.ts`).

## Running

You need `v8` or `d8`. If you don’t have it, install [jsvu]:

```
$ npm i -g jsvu
```

To run the actual benchmark and generate `results.csv`:

```
$ npm i
$ npm run benchmark
```

[jsblur]: https://github.com/nodeca/glur/blob/master/index.js
[assemblyscript]: https://www.assemblyscript.org/
[jsvu]: https://github.com/GoogleChromeLabs/jsvu
