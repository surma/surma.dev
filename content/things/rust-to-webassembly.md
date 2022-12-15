---json
{
  "title": "Compiling Rust to WebAssembly without wasm-bindgen",
  "date": "2022-12-02",
  "socialmediaimage": "social.png"
}

---

Rust comes with some great tooling to compile and produce WebAssembly modules, like [wasm-bindgen] and [wasm-pack]. But what do these tools actually do?

<!-- more -->

A long old time ago, I wrote a blog post on [how to compile C to WebAssembly without Emscripten][c to wasm]. It’s not something you wanna
do on a daily basis, because you lose access to the standard library and it’s generally quite inconvenient. At the same time, it gives you
a deeper understanding of what is happening and how much work the other tools are doing for you. It can also come in handy when you 
really want to take control of module and glue code size. So let’s do the same with Rust!

Before I start, though, the WebAssembly tooling for Rust is excellent and has gotten a lot better since I worked with it in [Squoosh].
The modules are phenomenally small and even the glue code is both modern and tree-shaken. I fully recommend using these tools
when writing Rust for WebAssembly.

## Rust Tooling

[c to wasm]: /things/c-to-webassembly
[wasm-bindgen]: https://rustwasm.github.io/wasm-bindgen/
[wasm-pack]: https://rustwasm.github.io/wasm-pack/
[squoosh]: https://squoosh.app
