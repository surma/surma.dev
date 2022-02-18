---
title: "WebGPU — All of the cores, none of the canvas"
date: "2022-02-13"
live: false
socialmediaimage: ""
---

WebGPU is an upcoming Web API (even in Safari!) that gives you low-level access to your GPU.

<!-- more -->

I am not very experienced with graphics. I picked up bits and bobs of WebGL by reading through tutorials on how to build game engines with OpenGL and learned more about shaders by watching [Inigo Quilez] do amazing things on [ShaderToy]. This got me far enough to do build things like the background animation in [PROXX], but I was never _comfortable_ with WebGL.

## WebGL
[WebGL] came about in 2011, up to this point, was the only way to utilize the GPU on the web. WebGL’s API design is really the same as OpenGL ES 2.0 with some thin wrappers and helpers to make it web-compatible. Both WebGL and OpenGL are standardized by the Khronos Group.

OpenGL’s API itself goes back even further and is, by today’s standard, not a great API.  API calls work on an internal, global state object that dictates which objects subsequent API calls will affect. The design makes sense from the perspective that it minimizes the amount of data that needs to be transferred to and from the GPU for any given call. However, it also introduces a lot of mental overhead.

<figure>
  <img loading="lazy" width="1193" height="1300" src="./internalstate.png">
  <figcaption>A visualization of WebGL’s internal, global state object. Visualization taken from <a href="https://webglfundamentals.org/webgl/lessons/resources/webgl-state-diagram.html" target="_blank" rel="noopener">WebGL Fundamentals</a>.</figcaption>
</figure>

Having an internal state object like this where you’re effectively manipulating pointers, means that the order of API calls is incredibly important and I always felt like, because of that, it is hard to build abstractions and libraries. You have to be extremely meticulous in saving and afterwards restoring the state so that your functions compose correctly. Because of this, I found myself staring at a black canvas more often than not. And that’s pretty much all you get in terms of error reporting. Now, that is probably mostly my fault, because people have been able to build _amazing_ stuff with WebGL (and OpenGL outside the web), but it just never really clicked for me.

With the advent of ML, neural networks, and dare I say cryptocurrencies, GPUs have established themselves as usefuk outside of direct grahpics applications. Using GPUs for calculations of any kind is often called General-Purpose GPU or GPGPU, and WebGL 1 is not great at that. To bring arbitrary data to the GPU you have to encode it as a texture, and the same goes for the result. WebGL 2 made this a lot easier with [Transform Feedback], but WebGL2 wasn’t supported in Safari unti September 2021, so it wasn’t really an option (while most other browers supported it since January 2017).

## WebGPU

Outside of the web, a new generation of graphics APIs have surfaced which expose a more low-level interface to graphics cards, to accommodate multiple requirements. On the one hand, GPUs are almost ubiquituous as even our mobile devices have capable GPUs built in. As a result, _both_ modern graphics programming (like ray tracing) and GPGPU use-cases are increasingly common. On the other hand, most of our devices have multi-core processors, so being able to interact from the GPU from multiple threads can be an important optimization vector. The most popular of the next-gen GPU APIs are Vulcan by the Khronos Group, Metal by Apple and DirectX 12 by Microsoft. To bring these new capabilities to the web, WebGPU was born. it abstracts the idiosyncrasies of these different APIs and has been standardized in the W3C with all major browser engines having a seat at the table.

Due to their low-level nature and their sheer power, WebGPU has a bit of a learning curve and is relatively heavy on the boiler plate, but I’ll try to break it down as best I can. As the title of this blog post implies, I will also on the GPGPU use-case, as I think it’s easier to grasp as an introduction to WebGPU. Let’s start by getting access to the GPU device itself:

### Adapters and Devices

WebGPU’s first abstractions that you come into contact with are _adapters_ and (logical) _devices_.

<figure>
  <img loading="lazy"  idth=418 height=393 src="./architecture.svg">
  <figcaption>The increasing layers of abstraction, from physical GPUs to logical devices.</figcaption>
</figure>

A _physical_ device is the GPU itself, often distinguished between built-in GPUs and discrete GPUs. Commonly, any given device has exactly one GPU, but it also possible to have two or more GPUs. For example, Microsoft’s SurfaceBook famously has a low-powered integrated GPU and a high-performance discrete GPU between which the operating system will switch on demand.

The _driver_ — provided by the GPU manufacturer — will expose the GPU’s capabilities to the operating system in a way it understands so that the operating system in turn can expose it with the graphics APIs the operating system offers, like Vulcan or Metal.

Now, access to the GPU needs to be mediated. It is a shared resource after all, and usually the one that controls what’s on your monitor. So there needs to be something that enables multiple processes to use the GPU concurrently, so that each app can put their own UI on screen, prevent apps from interfering with each other or reading each others’ data. This multiplexing is done by the operating system. To each process, it looks like they have sole control over the physical GPU, but that is obviously not really the case.

Adapters, in turn, are the translation layer from operation system’s native graphics API to WebGPU’s API. As the browser is a single OS-level application that can run multiple web applications, there is yet again a need for multiplexing, so that each web app feels like it has sole control of the GPU. This is modelled in WebGPU with the concept of _logical_ devices.

To get access to an adapter, you call `navigator.gpu.getAdapter()`. At the time of writing, [`requestAdapter()`][requestAdapter] takes very few options to allow you to insist on a high-performance or low-energy adapter (and, by extension, GPU). If this succeeds, i.e. the returned adapter is non-`null`, you can inspect the adapter’s capabilities and request a logical device using [`requestDevice()`][requestDevice].

```js
if (!navigator.gpu) throw Error("WebGPU not supported.");

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw Error("Couldn’t request WebGPU adapter.");

const device = await adapter.requestDevice();
if (!device) throw Error("Couldn’t request WebGPU logical device.");
```

Without any options, `requestDevice()` will return a device that does _not_ necessarily match the physical device’s capabilities, but rather the lowest common denominator of all GPUs in circulation today (as [specified][webgpu limits defaults] by the WebGPU standard). For example, even though my GPU is easily capable of handling data buffers up to 4GiB in size, the device returned will only allow data buffers up to 1GiB, and will reject any bigger data buffers. This might seem restrictive, but is actually quite helpful: If your WebGPU app runs on your device, it will also run on as many other devices as possible. If necessary, you can inspect the real limits of the physical GPU via `adapter.limits` and request raised limits by passing an options object to `requestDevice()`.

### Pipelines & Shaders

If you have ever done any work with WebGL, you are probably familiar with vertex shaders and fragment shaders. Without going too much into depth, the traditional setup works something like this: You upload a data buffer to your GPU and tell it how interpret that data. Most commonly, it would be a series of triangles that form a mesh. Each vertex would own a chunk of that data buffer. In that chunk it would most definitely store a position in 3D space, but there could also be additional data like color, texture IDs, normals and many other things. All together, that list of triangles and auxilliary data can form a 3D model. That list of triangles is processed by the GPU in the _vertex stage_, running the _vertex shader_ on each vertex. This is used, for example, to achieve translation, rotation or perspective distortion.

> **Note:** The term “shader” used to confuse me, because you can do _so much more_ than just shading. But in the olden days (late 1980s!), that term was appropriate: It was a small piece of code that ran on the GPU to decide for each pixel what color it should be so that you could _shade_ the objects being rendered, achieving the illusion of lighting and shadows. Nowadays, shaders loosely refer to any program that runs on the GPU.

Before the next step, the triangles are “colored in”. That is, the GPU figures out what pixels each triangle covers on the screen. Each pixel is then processed by the _fragment shader_, which has access to the pixel coordinates but also the auxilliary data to decide which color that pixel should be. This system of passing data to a vertex shader, then to a fragment shader and then outputting it directly onto the screen is called a _pipeline_, and in WebGPU you have to explicitly define a pipeline’s layout.

Currently, WebGPU allows you to create two types of pipelines: A Render Pipeline and a Compute Pipeline. As the name suggest, the Render Pipeline renders something, meaning it creates a 2D image. That image needn’t be on screen, but could just be rendered to memory, called a Framebuffer. A Compute Pipeline is more generic in that it returns a buffer. For the remainder of this blog post I’ll focus on Compute Pipelines, as I like to think of Render Pipelines as a specialization/optimization of Compute Pipelines. Now, this is not only historically backwards, but actually considerably understates how diffferent these pipelines are. Both are often completely separate units in the hardware and have contain considerable optimizations and shortcuts for their specific use-case. In terms of the API, however, I find my mental model quite good. In the future, it seems likely that more types of pipelines — maybe a Raytracing Pipeline — get added to WebGPU.

With WebGPU, a pipeline consists of one (or more) programmable stages, where each stage is defined by a shader and an entry point. A Compute Pipline has a single `compute` stage (while a Render Pipeline has a `vertex` and a `fragment` stage):

```js
const module = device.createShaderModule({
  code: `
    @stage(compute) @workgroup_size(64)
    fn main() {
      // Pointless!
    }
  `,
});

const pipeline = device.createComputePipeline({
  compute: {
    module,
    entryPoint: "main",
  },
});
```

<mark>Should I recommend using `createComputePipelineAsync` instead?</mark>

This is the first time [WGSL] (pronounced “wig-sal”), the WebGPU Shading Language, makes an appearance. WGSL is a somewhat Rust-inspired language <mark>that most likely is compiled to [SPIR-V] by your browser. SPIR-V is a binary format standardized by the Khronos Group that acts as an intermediate representation between multiple source and destination languages for parallel programming. You can think of it as the LLVM of parallel programming language compilers. The SPIR-V variant of your shader is then further compile to whatever your operating system and/or driver accepts.</mark>

<figure>
  <img loading="lazy" width=1400 height=697 src="./spirv.avif">
  <figcaption>A visualization of some of the possible input and output languages via SPIR-V, taken from the official SPIR-V website.</figcaption>
</figure>

In this example, we are just creating a function called `main` and marking it as an entry point for the compute stage by using the `@stage(compute)` attribute. You can have multiple functions marked as an entry point in a shader module, as you can reuse the same shader module for multiple pipelines and choose different functions to invoke via the `entryPoint` options.

So what is that `@workgroup_size(64)` attribute?

### Parallelism

GPUs are optimized for throughput at the cost of latency. To understand this, we have to look a bit at the architecture of GPUs.
I don’t want to (and, honestly, can’t) explain it in its entirety, but this [13-part blog post series][GPU Architecture] by [Fabian Giesen] is really good.

Something that is quite well-known is the fact that GPUs have an extensive number of cores that allow for massively parallel work. However, the cores are not as independent as you might be used to from when programming for a CPU. GPU cores are grouped hierarchically. While the terminology for the different elements of the hierarchy isn’t consistent across vendors and APIs, this [documentation by Intel][intel eu] gives some good insight that applies generally to today’s GPUs: The lowest level in the hierarchy is the “Execution Unit” (EU), which has seven [SIMT] cores. That means it has seven cores that operate in lock-step and always all execute the same instructions. They do, however, each have their own registers and even stack pointer. This is also the reason why branching (via `if`/`else`) is avoided when writing for GPUs: Unless all cores take the same branch, all cores have to execute _both_ branches, as they all have to execute the same instructions. The core’s local state will be set up so that the execution of the instructions in the false-y branch will not actually have any effect.

Despite the core’s frequency, getting data from memory (or pixels from textures) still takes relatively long, which would be wasted cycles. Instead, these cores are heavily oversubscribed with work items and are fast at context switching. Whenver an EU would end up idling, it instead switches to the next work item. This is what I mean by optimizing for throughput at the cost of latency. Individual work items will take longer, but the overall utilization is higher. There should always be work in the queue to keep EU utilization consistently high.

<figure>
  <img loading="lazy" width=548 height=492 src="./intel.avif">
  <figcaption>The architecture of an Intel Iris Xe Graphics chip. EUs have 7 SIMT cores. SubSlices have 8 EUs. 8 SubSlices form a Slice.</figcaption>
</figure>

EUs are just the lowest level in the hierarchy of cores. Multiple EUs are grouped into what Intel calls a “SubSlice”, which have access to a small amount of shared memory, which is about 64KiB in Intel’s case. If the program to be run has any synchronization commands, it has to be executed within the same SubSlice, as only they have shared memory to synchronize with.

In the last layer multiple SubSlices are grouped into a Slice, which forms the GPU. For an integrated Intel GPU, you end up with a total of 170-700 cores. Discrete GPUs can easily have 1500 and more cores. Again, the naming here is taken from Intel, and other vendors probably use different names, but the general architecture is similar in every GPU.

As this shows, the program to be executed needs to be architected in a specific way so it can be easily scheduled by the GPU and maximize utilizations of all EUs available. As a result, the graphics API expose a [threading model][thread group hierarchy] that naturally allows for work to be dissected this way. In WebGPU, the important primitive here is the “workgroup”.

### Workgroups

In WebGPU,

<figure>
  <img loading="lazy" width=2048 height=1280 src="./workgroups.avif">
  <figcaption></figcaption>
</figure>

[Corentin]: TL;DR use 64 unless you know what GPU you are targeting or that your workload needs something different.


[inigo quilez]: https://twitter.com/iquilezles
[shadertoy]: https://shadertoy.com
[webgl]: https://www.khronos.org/registry/webgl/specs/latest/1.0/
[proxx]: https://proxx.app
[transform feedback]: https://webgl2fundamentals.org/webgl/lessons/webgl-gpgpu.html
[requestadapter]: https://gpuweb.github.io/gpuweb/#gpu-interface
[requestdevice]: https://gpuweb.github.io/gpuweb/#gpuadapter
[webgpu limits defaults]: https://gpuweb.github.io/gpuweb/#limit
[Corentin]: https://twitter.com/dakangz
[WGSL]: https://gpuweb.github.io/gpuweb/wgsl
[spir-v]: https://www.khronos.org/spir/
[gpu architecture]: https://fgiesen.wordpress.com/2011/07/09/a-trip-through-the-graphics-pipeline-2011-index/
[fabian giesen]: https://twitter.com/rygorous
[thread group hierarchy]: https://github.com/googlefonts/compute-shader-101/blob/main/docs/glossary.md
[intel eu]: https://www.intel.com/content/www/us/en/develop/documentation/oneapi-gpu-optimization-guide/top/intel-processors-with-intel-uhd-graphics.html
[simt]: https://en.wikipedia.org/wiki/Single_instruction,_multiple_threads