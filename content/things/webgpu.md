---
title: "WebGPU — All of the cores, none of the canvas"
date: "2022-02-13"
live: false
socialmediaimage: ""
---

WebGPU is an upcoming Web API that gives you low-level, general-purpose access to your GPU.

<!-- more -->

I am not very experienced with graphics. I picked up bits and bobs of WebGL by reading through tutorials on how to build game engines with OpenGL and learned more about shaders by watching [Inigo Quilez] do amazing things on [ShaderToy]. This got me far enough to do build things like the background animation in [PROXX], but I was never _comfortable_ with WebGL.

When WebGPU came onto my radar, I started looking into it and found multiple people say that WebGPU has more boilerplate than WebGL. A bit discouraged, I scraped together tutorials and specifications of WebGPU to get my feet wet, and I realized that WebGPU is an API that doesn’t feel significantly more boilerplate-y than WebGL, but _does_ feel like an API I can understand and utilize successfuly.

In this blog post I want to give an introduction to WebGPU for web developers. I won’t use WebGPU to generate graphics, but instead how to use it to get access to that raw computing power a GPU can give you. Maybe I will do a follow-up blog post at some point on the graphics bit. I will go as deep as necessary to build the mental model of WebGPU and to enable you use it _effectively_, but not necessarily _efficiently_. I can’t make you a GPU performance expert mostly because I am not one myself.

Enough disclaimer. This is going to be a long one. Buckle up!

## WebGL
[WebGL] came about in 2011 and up to this point, was the only low-level primitive to access the GPU from the web. WebGL’s API design is really the same as OpenGL ES 2.0 with some thin wrappers and helpers to make it web-compatible. Both WebGL and OpenGL are standardized by the Khronos Group.

OpenGL’s API itself goes back even further and is, by today’s standard, not a great API.  API calls work on an internal, global state object that dictates which objects subsequent API calls will affect. The design makes sense from the perspective that it minimizes the amount of data that needs to be transferred to and from the GPU for any given call. However, it also introduces a lot of mental overhead.

<figure>
  <img loading="lazy" width="1193" height="1300" src="./internalstate.png">
  <figcaption>A visualization of WebGL’s internal, global state object. Visualization taken from <a href="https://webglfundamentals.org/webgl/lessons/resources/webgl-state-diagram.html" target="_blank" rel="noopener">WebGL Fundamentals</a>.</figcaption>
</figure>

The internal state object is basically an object with lots of pointers that you can manipulate, and what your _next_ API call will affect depends on what your pointers are currently pointing to. As a result, the order of API calls is incredibly important and I always felt like that this makes it incredibly hard to build abstractions and libraries. You have to be extremely meticulous in saving and restoring the state so that your functions compose correctly. I often found myself staring at a black canvas (as that’s pretty much all you get in terms of error reporting in WebGL) and brute-forcing which pointer is currently not pointing the right way. To be clear: That is probably mostly my fault, because people have been able to build _amazing_ stuff with WebGL (and OpenGL outside the web), but it just never really clicked for me.

With the advent of ML, neural networks, and dare I say cryptocurrencies, GPUs have shown that they can be useful for more than just drawing triangles on the screen. Using GPUs for calculations of any kind is often called General-Purpose GPU or GPGPU, and WebGL 1 is not great at that. If you wanted to process arbitrary data to the GPU you have to encode it as a texture, decode it in a shader, do your calculations and the re-encoded it as a texture so you can return the result. WebGL 2 made this a lot easier with [Transform Feedback], but WebGL2 wasn’t supported in Safari unti September 2021, so it wasn’t really an option (while most other browers supported WebGL2 since January 2017).

## WebGPU

Outside of the web, a new generation of graphics APIs have established themselves which expose a more low-level interface to graphics cards and accommodate multiple requirements. On the one hand, GPUs are almost ubiquituous now. Even our mobile devices have capable GPUs built in. As a result, _both_ modern graphics programming (like ray tracing) and GPGPU use-cases are increasingly common. On the other hand, most of our devices have multi-core processors, so being able to interact with the GPU from multiple threads can be an important optimization vector. The most popular of the next-gen GPU APIs are Vulcan by the Khronos Group, Metal by Apple and DirectX 12 by Microsoft. To bring these new capabilities to the web, WebGPU was born. It abstracts the idiosyncrasies of these different APIs and has been standardized in the W3C with all major browser vendors having a seat at the table.

Due to their low-level nature and their sheer power, WebGPU has a bit of a learning curve and is relatively heavy on the boilerplate, but I’ll try to break it down as best I can. As the title of this blog post implies, I will restrict myself to GPGPU use-case without using WebGPU to draw pixels. I think it may make it easier to grasp as an introduction to WebGPU.

### Adapters and Devices

WebGPU’s first abstractions that you come into contact with are _adapters_ and (logical) _devices_.

<figure>
  <img loading="lazy"  idth=418 height=393 src="./architecture.svg">
  <figcaption>The increasing layers of abstraction, from physical GPUs to logical devices.</figcaption>
</figure>

A _physical_ device is the GPU itself, often distinguished between built-in GPUs and discrete GPUs. Commonly, any given device has exactly one GPU, but it also possible to have two or more GPUs. For example, Microsoft’s SurfaceBook famously has a low-powered integrated GPU and a high-performance discrete GPU between which the operating system will switch on demand.

The _driver_ — provided by the GPU manufacturer — will expose the GPU’s capabilities to the operating system in a way the OS understands and expects. The operating system in turn can expose it to applications, using the graphics APIs the operating system offers, like Vulcan or Metal.

The GPU is a shared resource that not only needs to be used by many applications running on your machine, but that also controls what you see on your monitor. There needs to be something that enables multiple processes to use the GPU concurrently, so that each app can put their own UI on screen without interfering with other apps or even maliciously reading other apps’ data. This multiplexing is done by the operating system. To each process, it looks like they have sole control over the physical GPU, but that is obviously not really the case.

Adapters, in turn, are the translation layer from operation system’s native graphics API to WebGPU. As the browser is a single OS-level application that can run multiple web applications, there is yet again a need for multiplexing, so that each web app feels like it has sole control of the GPU. This is modelled in WebGPU with the concept of _logical_ devices.

To get access to an adapter, you call `navigator.gpu.getAdapter()`. At the time of writing, [`requestAdapter()`][requestAdapter] takes very few options to allow you to insist on a high-performance or low-energy adapter (and, by extension, GPU). If this succeeds, i.e. the returned adapter is non-`null`, you can inspect the adapter’s capabilities and request a logical device using [`requestDevice()`][requestDevice].

```js
if (!navigator.gpu) throw Error("WebGPU not supported.");

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw Error("Couldn’t request WebGPU adapter.");

const device = await adapter.requestDevice();
if (!device) throw Error("Couldn’t request WebGPU logical device.");
```

Without any options, `requestDevice()` will return a device that does _not_ necessarily match the physical device’s capabilities, but rather what the WebGPU team considers a reasonable, lowest common denominator of all GPUs. The details are [specified][webgpu limits defaults] in the WebGPU standard. For example, even though my GPU is easily capable of handling data buffers up to 4GiB in size, the `device` returned will only allow data buffers up to 1GiB, and will reject any bigger data buffers. This might seem restrictive, but is actually quite helpful: If your WebGPU app runs on your device, it will also run on as many other devices as possible. If necessary, you can inspect the real limits of the physical GPU via `adapter.limits` and request a `device` with raised limits by passing an options object to `requestDevice()`.

### Vertex & Fragment Shaders

If you have ever done any work with WebGL, you are probably familiar with vertex shaders and fragment shaders. Without going too much into depth, the traditional setup works something like this: You upload a data buffer to your GPU and tell it how interpret that data as a series of triangles. Each vertex would occupy a chunk of that data buffer, containing a position in 3D space, but probably also additional data like color, texture IDs, normals and many other things. That list of triangles is processed by the GPU in the _vertex stage_, running the _vertex shader_ on each vertex, which will apply translation, rotation or perspective distortion.

> **Note:** The term “shader” used to confuse me, because you can do _so much more_ than just shading. But in the olden days (late 1980s!), that term was appropriate: It was a small piece of code that ran on the GPU to decide for each pixel what color it should be so that you could _shade_ the objects being rendered, achieving the illusion of lighting and shadows. Nowadays, shaders loosely refer to any program that runs on the GPU.

The triangles are now rasterized (think: “colored in”), meaning the GPU figures out what pixels each triangle covers on the screen. Each pixel is then processed by the _fragment shader_, which has access to the pixel coordinates but also the auxilliary data to decide which color that pixel should be. When used correctly, amazing 3D graphics can be created with this process.

This system of passing data to a vertex shader, then to a fragment shader and then outputting it directly onto the screen is called a _pipeline_, and in WebGPU you have to explicitly define your pipeline.

### Pipelines

Currently, WebGPU allows you to create two types of pipelines: A Render Pipeline and a Compute Pipeline. As the name suggest, the Render Pipeline renders something, meaning it creates a 2D image. That image needn’t be on screen, but could just be rendered to memory (which is called a Framebuffer). A Compute Pipeline is more generic in that it returns a buffer, which can contain any sort of data. For the remainder of this blog post I’ll focus on Compute Pipelines, as I like to think of Render Pipelines as a specialization/optimization of Compute Pipelines. Now, this is not only historically backwards, but actually considerably understates that these pipelines occupy different circuits in your GPU. They are often completely separate units in the hardware and the rendering pipeline contains considerable optimizations and shortcuts. In terms of the API, however, I find my mental model quite good. <mark>In the future, it seems likely that more types of pipelines — maybe a Raytracing Pipeline — get added to WebGPU.</mark>

With WebGPU, a pipeline consists of one (or more) programmable stages, where each stage is defined by a shader and an entry point. A Compute Pipline has a single `compute` stage, while a Render Pipeline would have a `vertex` and a `fragment` stage:

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

This is the first time [WGSL] (pronounced “wig-sal”), the WebGPU Shading Language, makes an appearance. WGSL is a somewhat Rust-inspired language <mark>that most likely is compiled to [SPIR-V] by your browser. SPIR-V is a binary format standardized by the Khronos Group that acts as an intermediate representation between multiple source and destination languages for parallel programming. You can think of it as the LLVM of parallel programming language compilers. You probably won’t come into contact with SPIR-V directly, but it’s interesting to know that it’s there.</mark>

In this example, we are just creating a function called `main` and marking it as an entry point for the compute stage by using the `@stage(compute)` attribute. You can have multiple functions marked as an entry point in a shader module, as you can reuse the same shader module for multiple pipelines and choose different functions to invoke via the `entryPoint` options. But what is that `@workgroup_size(64)` attribute?

### Parallelism

<mark>This section needs to be scrutinized by someone with expertise!</mark>

GPUs are optimized for throughput at the cost of latency. To understand this, we have to look a bit at the architecture of GPUs.
I don’t want to (and, honestly, can’t) explain it in its entirety, but this [13-part blog post series][GPU Architecture] by [Fabian Giesen] is really good.

Something that is quite well-known is the fact that GPUs have an extensive number of cores that allow for massively parallel work. However, the cores are not as independent as you might be used to from when programming for a CPU. GPU cores are grouped hierarchically. While the terminology for the different elements of the hierarchy isn’t consistent across vendors and APIs, this [documentation by Intel][intel eu] gives some good insight that applies generally to today’s GPUs: The lowest level in the hierarchy is the “Execution Unit” (EU), which has seven [SIMT] cores. That means it has seven cores that operate in lock-step and always execute the same instructions. They do, however, each have their own registers and even stack pointer. This is also the reason why GPU performance experts avoid branches (like using `if`/`else`): Unless all cores take the same branch, all cores have to execute _both_ branches, as they all have to execute the same instructions. The same applies for loops: If one core finishes their loop early, it will have to keep executing the loop instructions until _all_ cores have finished the loop. In these cases, thes cores’ local state will be set up so that the execution of the instructions will not actually have any effect.

Despite the core’s frequency, getting data from memory (or pixels from textures) still takes relatively long — typically a couple hundred clock cycles — which are a couple hundred cycles that could be spent on computation instead. To not waste these cycles, these cores are heavily oversubscribed with work items and are fast at context switching. Whenever an EU would end up idling, it instead switches to the next work item. This is what I mean by optimizing for throughput at the cost of latency. Individual work items will take longer, but the overall utilization is higher. There should always be work in the queue to keep EU utilization consistently high.

<figure>
  <img loading="lazy" width=548 height=492 src="./intel.avif">
  <figcaption>The architecture of an Intel Iris Xe Graphics chip. EUs have 7 SIMT cores. SubSlices have 8 EUs. 8 SubSlices form a Slice.</figcaption>
</figure>

EUs are just the lowest level in the hierarchy of cores. Multiple EUs are grouped into what Intel calls a “SubSlice”, which have access to a small amount of shared memory, which is about 64KiB in Intel’s case. If the program to be run has any synchronization commands, it has to be executed within the same SubSlice, as only they have shared memory to synchronize with.

In the last layer multiple SubSlices are grouped into a Slice, which forms the GPU. For an integrated Intel GPU, you end up with a total of 170-700 cores. Discrete GPUs can easily have 1500 and more cores. Again, the naming here is taken from Intel, and other vendors probably use different names, but the general architecture is similar in every GPU.

As this shows, the program to be executed needs to be architected in a specific way so it can be easily scheduled by the GPU and maximize utilizations of all EUs available. As a result, the graphics API expose a [threading model][thread group hierarchy] that naturally allows for work to be dissected this way. In WebGPU, the important primitive here is the “workgroup”.

### Workgroups

Your shader will be invoked once for each work item that you have scheduled. In the traditional setting, the vertex shader would get invoked once for each vertex, and the fragment shader once for each pixel (I’m glossing over some details here, I know). In the GPGPU setting, it is up to us to define what a work item entails.

The collection of all work items (which I will call the “workload”) is broken down into workgroups. All work items in a workgroup are scheduled to run together as they have access to a bit of shared memory (so it corresponds to the SubSlice in the previous section). In WebGPU, the work load is modelled as a 3-dimensional grid, where each “cube” is a work item, and work items are grouped into bigger cuboids to form a workgroup.

<figure>
  <img loading="lazy" width=2048 height=1280 src="./workgroups.avif">
  <figcaption>White-bordered cubes are a work item. Red-bordered cubiods are a workgroup. All red cubes contain the work load.</figcaption>
</figure>

Finally, we have enough information to talk about the `@workgroup_size(x, y, z)` attribute: This allows you to tell the GPU what the required workgroup size for this shader is. I.e. what the dimensions of the red-bordered cubes should be along each spatial dimension. Any skipped parameter is assumed to be 1, so in our case, `@workgroup_size(64)` is equivalent to `@workgroup_size(64, 1, 1)`.

Of course, the actual EUs are not arranged in the 3D grid on the chip. The aim of modelling work items in a 3D grid was to increase locality. That is, neighboring work groups would access similar areas in memory, so subsequent runs would have less cache misses. However, most hardware seemingly just runs workgroups in a serial order, so this concept is considered somewhat legacy. The same shader will run pretty much the same, whether you declare it `@workgroup_size(64)` or `@workgroup_size(8, 8)`.

However, workgroup are restricted in multiple ways: `device.limits` has a bunch of properties that are worth knowing:

```js
// device.limits
{
  // ...
  maxComputeInvocationsPerWorkgroup: 256,
  maxComputeWorkgroupSizeX: 256,
  maxComputeWorkgroupSizeY: 256,
  maxComputeWorkgroupSizeZ: 64,
  maxComputeWorkgroupsPerDimension: 65535,
  // ...
}
```

The size of each dimension of a workgroup size is restricted, but so is the volume ($ = X \times Y \times Z$) of a workgroup. Lastly, you can only have so many workgroups per dimension.

> **Pro tip:** Don’t spawn the maximum number of threads. Despite the GPU being managed by the OS and an underlying scheduler, individual jobs can’t be preempted on the GPU. So [a long-running GPU program can just leave your entire system visually frozen][frozen tweet].

This is all a bit much, I get it. So I’d like to give you the same advice that [Corentin] gave me: “Use [a workgroup size] of 64 unless you know what GPU you are targeting or that your workload needs something different.”

### Commands

We are about to finish our minimal and admittedly useless WebGPU sample. We have written our shader and set up the pipeline. All that’s left to do is actually invoke the GPU to execute it all. As a GPU _can_ be a completely separate card with it’s own memory chip, you control it via a so-called command buffer or command queue. The command queue is a chunk of memory that contains encoded commands for the GPU to execute in order. The encoding is highly specific to the GPU and is abstracted by the driver. As such, WebGPU exposes a `CommendEncoder` that does exactly what it says on the tin.

```js
const commandEncoder = device.createCommandEncoder();
const passEncoder = commandEncoder.beginComputePass();
passEncoder.setPipeline(pipeline);
passEncoder.dispatch(1);
passEncoder.end();
const commands = commandEncoder.finish();
device.queue.submit([commands]);
```

`commandEncoder` has multiple methods that allows you to copy data from one GPU buffer to another and manipulate textures, but it also allows you to queue up “passes”, which are invocations of one of the pipelines. In this case, we have compute pipline, so we have to create a compute pass, set it to use our pre-declared pipeline and use `dispatch(x, y, z)` to tell the GPU how many workgroups there are along each dimension. That is, the number of times our compute shader will be invoked is equal to $\text{\#Workgroups} \times \text{size}(\text{workgroup})$.

The command buffer is also the hook for the driver or operating system to let multiple applications use the GPU without them noticing. When you queue up your commands, the abstraction layers below will inject additional commands into the queue to save the previous program’s state and restore your program’s state so that it feels like no one else is using the GPU.

With this in place we are in fact spawning 64 threads on the GPU and having them do _absolutely nothing_. We haven’t even given the GPU any data to process, so let’s change that.

## Balls

I am refusing to use WebGPU for graphics, at least for now, so I’ll be running a physics simulation on the GPU and visualizing it using Canvas2D. Maybe I am flattering myself calling it a “physics simulation”. What I am doing is generating a whole bunch of circles, have them roll around on a plane in random directions and letting them collide.

This is arguably the hairiest part of WebGPU, as there’s lot of upfront declaration and seemingly pointless copying of data, but this is what allows WebGPU to be a device-agnostic API that will still allow you to operate at the highest level of performance.

Before we talk about what the actual data looks like, we need be able to exchange data with the GPU. This is achieved by extending our pipeline definition with a bind group layout. A bind group is a group of GPU entities (memory buffers, textures, samplers, etc) that are bound to variables in our WGSL code (or other parts of the GPU). The bind group _layout_ defines the different purposes of these GPU entities, which allows the GPU figure out how to guarnatee the best possible performance characteristics ahead of time. Let’s keep it simple in this initial step and give our pipeline a single memory buffer:

|||codediff|js
+ const bindGroupLayout = device.createBindGroupLayout({
+   entries: [{
+     binding: 1,
+     visibility: GPUShaderStage.COMPUTE,
+     buffer: {
+       type: "storage",
+     },
+   }],
+ });

  const pipeline = device.createComputePipeline({
+   layout: device.createPipelineLayout({
+     bindGroupLayouts: [bindGroupLayout],
+   }),
    compute: {
      module,
      entryPoint: "main",
    },
  });
|||

The `binding` number can be freely chosen and we’ll use it in our WGSL code to tell which variable should reflect the contents of which buffer from the bind group.  Our `bindGroupLayout` also defines the purpose for each buffer, which in this case is `"storage"`. Another option is `"read-only-storage"`, which is read-only (duh!), and allows the GPU to make further optimizations on the basis that this buffer will never be written to and as such doesn’t need to be synchronized. The last possible value for the buffer type is `"uniform"`, which in the context of a compute pipeline is not very useful and mostly functionally equivalent, but with more restrictions.

With out bind group layout in place, we can now create the actual bind group itself: the collection of buffers that adheres to the layout. But there’s a hurdle: Staging Buffers.

### Staging Buffers

I will say it again: GPUs are heavily optimized for throughput at the cost of latency. A GPU needs to be able feed data to the cores at an incredibly high rate to sustaing that throughput. Fabian did some [back-of-napkin math][texture bandwidth] in his blog post series from 2011, and arrived at the conclusion that GPUs needs to sustain 3.3GB/s _just for texture samples_ for a shader running at 1280x720 resolution. To accommodate today’s graphics demands, GPUs need to be even faster. This is only possible to achieve  if the memory of the GPU is very tightly integrated with the cores. It’s just not possible to _also_ expose the same memory to the host machine and make it writable directly.

Instead, GPUs have additional memory banks that are both visible to the host machine as well as having access to those high-performance memory banks. Staging buffers are allocated in this intermediate memory realm so that they can be [mapped][memory mapping] to the host system and then be written to. Then in a second step, the data can be copied from the staging realm to the high-performance memory realm and be processed by the GPU. For reading memory from the GPU, the same process is used but in reverse.

Back to our code: The plan for this example is to provide an empty buffer to be filled in by the compute shader. We will provide a writable buffer for the bind group, that will be located in the high-performance memory section. We will also create a second, equally sized buffer that will act as a staging buffer. Instead of providing high-level flags like `isStaging`, WebGPU requires you to define a `usage` bitmap for each buffer, where you declare what you want to use this buffer for. The GPU will then tell you if it can create a buffer for this use-case.

```rust
const BUFFER_SIZE = 1000;

const output = device.createBuffer({
  size: BUFFER_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
});

const stagingBuffer = device.createBuffer({
  size: BUFFER_SIZE,
  usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [{
    binding: 1,
    resource: {
      buffer: output,
    },
  }],
});
```

Note that `createBuffer()` returns a `GPUBuffer`, not an `ArrayBuffer`. They can’t be read or written to. For that, they need to be mappable and explicitly mapped, which will do next!

Now that we not only have the bind group _layout_, but even the actual bind group itself, we need to update our dispatch code to make use of this bind group and map our staging buffer to be able to read the results.

|||codediff|js
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
+ passEncoder.setBindGroup(0, bindGroup);
- passEncoder.dispatch(1);
+ passEncoder.dispatch(Math.ceil(BUFFER_SIZE / 64));
  passEncoder.end();
+ commandEncoder.copyBufferToBuffer(
+   output,
+   0, // Source offset
+   stagingBuffer,
+   0, // Destination offset
+   BUFFER_SIZE
+ );
  const commands = commandEncoder.finish();
  device.queue.submit([commands]);

+ await stagingBuffer.mapAsync(GPUMapMode.READ, 0, BUFFER_SIZE);
+ const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);
+ const data = copyArrayBuffer.slice();
+ stagingBuffer.unmap();
+ console.log(new Float32Array(data));
|||

Since our pipeline has been extended with a bind group layout, our dispatch code would not fail if we didn’t also provide a bind group, as we are doing with `passEncoder.setBindGroup()`. After we define our “pass”, we add an additional command via our command encoder to copy the data from our output buffer to the staging buffer and submit our command buffer to the queue. The GPU will start working hard to crunching through our code (which still does nothing), while we already submit our request for the `stagingBuffer` to be mapped. This function is async as it needs to wait until all commands currently in the device’s queue have been processed. Once that promise is resolved, the buffer is mapped, but not exposed to JavaScript yet. With `stagingBuffer.getMappedRange()` we can request for a subsection (or the entire buffer) to be exposed to JavaScript as an good ol’ `ArrayBuffer`. This is real mapped memory, meaning the data will disappear (the `ArrayBuffer` will be “detached”), when `stagingBuffer` gets unmapped. `slice()` is a quick way to create a copy.

<figure>
  <img loading="lazy" width=1024 height=429 src="./emptybuffer.avif">
  <figcaption>Not very exciting, but these zeroes were generted by our GPU.</figcaption>
</figure>

Before we start doing any advanced calculation on our GPU, let’s just fill in some data to see that our pipeline is _indeed_ working as intended. This is our _new_ compute shader code, with extra spacing for clarity.

```rust
@group(0) @binding(1)
var<storage, write> output: array<f32>;

@stage(compute) @workgroup_size(64)
fn main(

  @builtin(global_invocation_id)
  global_id : vec3<u32>,

  @builtin(local_invocation_id)
  local_id : vec3<u32>,

) {
  output[global_id.x] = f32(global_id.x) * 100. + f32(local_id.x);
}
```

The first two lines declare a module-scope variable called `output`, which is a dynamically-sized array of `f32`. The attributes declare where the data comes from: From our first (0th) binding group, the entry with `binding` value 1.

Our `main()` has been augmented with two parameters: `global_id` and `local_id`. I could have chosen any name, their value is determined by the attributes preceding them: The `global_invocation_id` is a built-in value that corresponds to the glboal x/y/z coordinates of this shader invocation in the work _load_. The `local_invocation_id` are the x/y/z coordinates of this shader vocation in the work _group_. Our workgroup size is $(64, 1, 1)$, so `local_id.x ` will range from 0 to 64. I am “encoding” both a float here, where the last two digits are the local invocation ID, while everything else is the global invocation ID:

<figure>
  <img loading="lazy" width=1024 height=565 src="./fullbuffer.avif">
  <figcaption>Actual values filled in by the GPU. Notice how the local invocation ID starts wrapping around after 63, while the global invocation ID keeps going.</figcaption>
</figure>

The astude observer might have notices that our current number of invocations (`Math.ceil(BUFFER_SIZE / 64)`) will result in `global_id.x` getting bigger than our our buffer has slots. Array index access will get clamped, so every value that tries to access beyond the end of the array will end up access the last element of the array. That avoids bad memory access faults, but might still generate unsuable data. And indeed, if you check the last 3 elements of the returned buffer, you’ll find the numbers 24755, 24856 and 60832. It’s up to us, to prevent that from happening. A simple early exit will do:

|||codediff|rust
  fn main( /* ... */) {
+   if(global_id.x > arrayLength(&output)) {
+     return;
+   }
    output[global_id.x] = f32(global_id.x) * 100. + f32(local_id.x);
  }
|||

If you want, you can run this [demo][demo1] and inspect the full source.

### A structure for the madness

Our goal here is to have a whole lotta balls moving through 2D space and have happy little collisions. We could just continue working on `array<f32>`, and say the first float is the first ball’s x position, the second float is the first ball’s y position and so on, and so forth. That’s not what I would call ergonomic. Luckily, WGSL allows us to define our own structs to pack multiple pieces of data together. The downside: we have to talk about [alignment].

If you know what memory alignment is, you can skip this section (although do take a look at the code sample as I will be building off of that). If you don’t know what it is, I won’t really explain the why and how, but show you how it manifests and how to work with it.

Each ball has a radius, a position and a velocity vector, so it makes sense to group them together in a struct and treat them as a single entity. Instead of using an `array<f32>` as output, we can now use a `array<Ball>`.

```rust
struct Ball {
  radius: f32;
  position: vec2<f32>;
  velocity: vec2<f32>;
}

@group(0) @binding(1)
var<storage, write> output: array<Ball>;

@stage(compute) @workgroup_size(64)
fn main(
  @builtin(global_invocation_id) global_id : vec3<u32>,
  @builtin(local_invocation_id) local_id : vec3<u32>,
) {
  let num_balls = arrayLength(&output);
  if(global_id.x >= num_balls) {
    return;
  }

  output[global_id.x].radius = 999.;
  output[global_id.x].position = vec2<f32>(global_id.xy);
  output[global_id.x].velocity = vec2<f32>(local_id.xy);
}
```

If you run this [demo][demo2], you’ll see this in your console:

<figure>
  <img loading="lazy" width=479 height=440 src="./alignment.avif">
  <figcaption>The struct has a hole (padding) in its memory layout due to aligment constraints.</figcaption>
</figure>

I used the compute shader store `999` the first field of the struct as to mark where the struct begins in the ArrayBuffer. There’s a total of 6 numbers until we reach the next `999`, which might be surprising because the struct really only has 5 numbers to store: `radius`, `position.x`, `position.y`, `velocity.x` and `velocity.y`. Taking a closer look, it is clear that the number after `radius` is always $0$. This is because of alignment.

Each data WGSL type has well-defined [alignemnt requirements][wgsl alignment]. If a datatype has an alignment of $N$, it means that a value of that data type can only be stored at an address that is a multiple of $N$. For example, a `f32` has an alignment of 4, while a `vec2<f32>` has an alignment of 8. If we assume our struct starts at address 0, then the `radius` field can be stored at address 0, as it is a multiple of 4. The next available address is 4 (as an `f32` is 4 bytes long), but the next field in the struct is `vec2<f32>`, which has an alignment of 8, which doesn’t work. So the compiler adds padding (4 unused bytes) to get to the next address that is a multiple of 8 to fullfil the alignment requirement of `vec2<f32>`.

<figure>
  <img loading="lazy" width=797 height=605 src="./alignmenttable.avif">
  <figcaption>

The (shortened) [alignment table][wgsl alignment] from the WGSL spec.

  </figcaption>
</figure>


Now that we know how our struct is laid out in memory, we can populate it from JavaScript to generate our initial state of balls and also read it back to visualize it.

> **Note:** <mark>Talk about buffer-backed-object</mark>

### Input & Output

So far we have used the compute shader to generate data pretty much out of thin air. It’s much more interesting to pass existing data into the compute shader and have it process that. Generating a random set of balls is quite easy:

```js
let inputBalls = new Float32Array(new ArrayBuffer(BUFFER_SIZE));
for (let i = 0; i < NUM_BALLS; i++) {
  inputBalls[i * 6 + 0] = random(2, 10);
  inputBalls[i * 6 + 1] = 0; // Padding
  inputBalls[i * 6 + 2] = random(0, ctx.canvas.width);
  inputBalls[i * 6 + 3] = random(0, ctx.canvas.height);
  inputBalls[i * 6 + 4] = random(-100, 100);
  inputBalls[i * 6 + 5] = random(-100, 100);
}
```

We also already know how to expose data to our shader. We just need to adjust our pipeline bing group layout to expect another buffer:

|||codediff|js
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
+     {
+       binding: 0,
+       visibility: GPUShaderStage.COMPUTE,
+       buffer: {
+         type: "read-only-storage",
+       },
+     },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },
    ],
  });
|||

and create a GPU buffer that we can bind using our bind group:

|||codediff|js
+ const input = device.createBuffer({
+   size: BUFFER_SIZE,
+   usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
+ });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
+     {
+       binding: 0,
+       resource: {
+         buffer: input,
+       },
+     },
      {
        binding: 1,
        resource: {
          buffer: output,
        },
      },
    ],
  });
|||

Now for the new part: Sending data to the GPU. Just like with reading data, we technically have to create a staging buffer that we can map, copy our data over and then issue a command to copy our data from the staging buffer into the storage buffer. However, WebGPU offers a convenience function that will choose the most performance way of getting data to the GPU for you:

```js
device.queue.writeBuffer(input, 0, inputBalls);
```

That’s it? That’s it! We don’t even need a command encoder. We can just put it directly in the command queue. `device.queue` offers similar convenience functions for textures as well. Let’s augment the shader to do some work with it:

```rust
struct Ball {
  radius: f32;
  position: vec2<f32>;
  velocity: vec2<f32>;
}

@group(0) @binding(0)
var<storage, read> input: array<Ball>;

@group(0) @binding(1)
var<storage, write> output: array<Ball>;

let TIME_STEP: f32 = 0.016;

@stage(compute) @workgroup_size(64)
fn main(
  @builtin(global_invocation_id)
  global_id : vec3<u32>,
) {
  let num_balls = arrayLength(&output);
  if(global_id.x >= num_balls) {
    return;
  }
  let src_ball = input[global_id.x];
  let dst_ball = &output[global_id.x];

  (*dst_ball) = src_ball;
  (*dst_ball).position = (*dst_ball).position + (*dst_ball).velocity * TIME_STEP;
}
```

I hope that the vast majority of this shader code is no surprise to you at this point. The only thing that is worth pointing out is that WGSL has the notion of pointers. This is important as the default behavior in WGSL is to copy a value. So in this case `dst_ball` is a _pointer_ to the field in the array that this shader invocation is supposed to populate.

<figure>
  <video width="512" height="512" src="./step3.webm" type="video/webm" style="max-width: 512px" muted loop controls></video>
  <figcaption>Every frame, WebGPU is used to update the position of the balls. They drawn to screen using Canvas2D.</figcaption>
</figure>

Lastly, all we need to do is read the `output` buffer back into JavaScript, write some Canvas2D code to visualize the contents of the buffer and put it all in a `requestAnimationFrame()` loop. You can see the result this [demo][demo3].

## Performance

The previous demo just moves each ball along their velocity vector. Not exactly thrilling. Before we look at the performance characteristics of our creation, let me drop in some proper physics calculations in the shader. I won’t explain them here — the blog post is long enough as it is. If you are curious, you can take a look at the source code of the [final demo][demo4].

<figure>
  <video width="512" height="512" src="./step4.webm" type="video/webm" style="max-width: 512px" autoplay muted loop controls></video>
  <figcaption>... now with bouncy walls and bouncy balls!</figcaption>
</figure>

I don’t want to shine too much light on the exact performance characteristics. I haven’t really optimized neither the physics algorithm nor my usage of WebGPU, but even this naïve implementation performs really well. On my M1 MacBook Air, I can go to around 2500 balls before we drop below 60fps. However, looking at a trace that’s because Canvas2D is taking too long to draw all the balls every frame.

<figure>
  <img loading="lazy" width=1024 height=625 src="./performance.avif">
  <figcaption>At 14000 balls, the raw GPU computation time reaches ~16ms on a M1 MBA.</figcaption>
</figure>

So disabled rendering and instead used [`performance.measure()`][measure] to see how many balls I can simulate before exhausting my frame budget of 16ms. It turns out, that happens at around 14000 balls on this machine. Something this unoptimized running this fast, really makes me drunk on power on how much computational power WebGPU gives me access to.

## Stability & Availability

WebGPU has been worked on for a while and I think most browser vendors are eager to declare the API as stable. That being said, the API is only available in Chrome and Firefox behind a flag. I’m optimistic about Safari shipping this API but at the time of writing there’s nothing to see in Safari TP just yet.

In terms of stability, some changes landed even while I was doing the research for this article. For example, attributes like `@stage(compute) @workgroup_size(64)` used to be `[[stage(compute), workgroup_size(64)]]` and they still are in Firefox. `passEncoder.end()` used to be `passEncoder.endPass()` and so on. There are also some things in the spec that haven’t been implemented in any browser yet like [shader constants][constants] or the API being enabled on mobile devices.

Basically what I am saying is: Expect some more breaking changes to land while the browser and standards folks are on the home stretch of this API’s journey to ✨stable✨.

## Conclusion

Having a modern API to talk to GPUs on the web is going to be very interesting. After investing time to overcome the initial learning curve, I really feel empowered to run massively parallel workloads on the GPU using JavaScript. There is also [wgpu], which implements the WebGPU API in Rust, allowing you to use the API outside the browser (although they also support WebAssembly as a compile target). Fun fact: [Deno] already has support for WebGPU thanks to wgpu, allowing you to utilize your GPU. Exciting times.

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
[frozen tweet]: https://twitter.com/DasSurma/status/1495096911333842946
[texture bandwidth]: https://fgiesen.wordpress.com/2011/07/04/a-trip-through-the-graphics-pipeline-2011-part-4/#:~:text=that%E2%80%99s%203.3%20GB/s%20just%20for%20texture%20request%20payloads.%20Lower%20bound%2C
[memory mapping]: https://en.wikipedia.org/wiki/Memory-mapped_I/O
[demo1]: ./step1/index.html
[alignment]: https://en.wikipedia.org/wiki/Data_structure_alignment
[wgsl alignment]: https://gpuweb.github.io/gpuweb/wgsl/#alignment-and-size
[demo2]: ./step2/index.html
[demo3]: ./step3/index.html
[demo4]: ./step4/index.html
[measure]: https://developer.mozilla.org/en-US/docs/Web/API/Performance/measure
[constants]: https://gpuweb.github.io/gpuweb/#dom-gpuprogrammablestage-constants
[wgpu]: https://github.com/gfx-rs/wgpu
[deno]: https://deno.land