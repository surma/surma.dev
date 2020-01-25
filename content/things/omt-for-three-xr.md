---json
{
"title": "Case study: Moving a Three.JS-based WebXR app off-main-thread",
"date": "2020-01-23",
"socialmediaimage": "social.png",
"live": false
}

---

Keeping the frame rate stable is literally vital for virtual reality applications. Off-main-thread architecture can help ensure that the frames keep shipping.

<!-- more -->

I recently [became the owner of an Oculus Quest][oculus tweet], and since the browser that comes with it has support for [WebXR][webxr spec], it was time to play around with that! I looked at the [Three.JS examples] and tried out the XR samples. Annoyingly, even the bare-bones [Ballshooter] was fun to play with. However, I felt like it didn’t have enough balls. Time to start hacking!

<figure>
  <video src="emitChunk(/things/omt-for-three-xr/ballshooter-original.mp4)" muted loop controls></video>
  <figcaption>The original Ballshooter example from <code>threejs.org</code></figcaption>
</figure>

## Step 1: Run prettier

I ripped out the demo from the repository and had to run [Prettier]. What were you _thinking_, [MrDoob][mrdoob]? I refactored the code a bit to give me a bunch of top-level variables as values to fiddle with:

```js
// Field of View
var fov = 50;
// Number of balls;
var ballCount = 200;
// Radius of one ball
var radius = 0.08;
// Size of the room
var roomSize = 6;
// Loss of velocity when bouncing of walls
var dampening = 0.8;
```

> **Note:** All steps of this case-study are captured in a [gist] that you can check out and go through commit by commit, if you want.
> The next step is obviously to increase the number of balls:

```diff
- var ballCount = 200;
+ var ballCount = 500;
```

Running that example with an increased number of balls seemed to affect the framerate. The balls’ movements were jankier, but acceptable. However, the head tracking was affected by the same jank, making the game noticeably uncomfortable to use over longer periods of time. A quick trace confirms:

<figure>
  <img src="trace-original-500.png">
  <figcaption>The trace shows that each frame takes around 16.1ms, which is over budget. However, roughly 10ms of that are the purely computational physics.</figcaption>
</figure>

Looking at the trace, each frame takes around 16ms. Which in the normal web world would be fine, although definitely cutting it close. In the VR world however, we have different frame rates. The Oculus Quest specifically runs at 72Hz. Most VR headsets actually run at 90Hz, but occasionally even higher. **That means that we have 14ms per frame** and the current code is blowing through that budget.

> **Note:** More experienced WebGL developers will feel the urge to point out that the example code does not make use of instanced rendering. That is correct and switching to instanced rendering should free up some of our main thread budget. The overall point however remains the same (but we will switch to instanced rendering later).

This is the same problem I talked about in a [previous blog post][when workers]: **The performance metrics of the device you run are unpredictable and not under your control.** This is a problem on the web as I have explained in that blog post, but it becomes a detrimental problem for virtual reality. Dropping frames and unsteady frame rates can be nausea inducing for users. As this will _render_ the app unusable, it is _vital_ to avoid dropping frames at all costs. How do we do that?

## Adding a worker

To nobody’s surprise, this is all just an excuse to talk about workers and off-main-thread architecture. As I proclaimed in [my Chrome Dev Summit 2019 talk][cds19 talk], the mantra is “the UI thread is for UI work only”. The UI thread will run Three.JS to render the game using WebGL and will use WebXR to the parameters of the VR headset and the controllers. What should _not_ run on the UI thread are the physics calculations that make the balls bounce off the wall and off each other.

The physics engine is tailored to this specific app. It is effectively hard-coded to handle a number of balls of the same size in a fixed size room. The implementation is as straight forward as it is unoptimized. We keep all the balls’ positions and velocities in an array. Each ball’s velocity is changed according to gravity, each ball’s position is changed according to its velocity. We check all pairings of balls if they intersect, and if they do they are be separated and their velocity is changed as if they bounced off of each other.

Moving this code to a worker is easily doable as it is purely computational and doesn’t make use of any APIs. Since we don’t have a `requestAnimationFrame()` in a worker, we will have to make it work with good old `setTimeout()`. We’ll run the physics simulation at 90 ticks per second to make sure we can deliver a fresh frame to most VR devices.

> **Note:** `requestAnimationFrame` has been made available in Workers in Chrome, but even if all browsers had that, it would run at the framerate of the web renderer, not necessarily of the VR headset itself. This is something I’d love to see added to the WebXR API.

The question is how we inform the UI thread of the new positions of the spheres. We could take the naïve approach and just send a JavaScript array containing the positions for all balls for every frame. A quick estimation based on [the rule of thumb I presented in another previous blog post][is postmessage slow] reveals: Structured cloning an array of that size would take long enough to potentially blow our frame budget at 60fps (let alone for 72fps or even 90fps). And that’s just transfer time without any rendering. **For a hot-path like this, structured cloning is not going to cut it.**

### ArrayBuffer

[`ArrayBuffer`][arraybuffer] are a continuous chunk of memory. Just a bunch of bits. Using [`ArrayBuffer` views][typedarray] you can interpret that chunk of memory in different ways. Using `Int8Array` you can interpret it as a sequence of 8-bit signed integers, using `Float32Array` you can interpret it as a sequence of 32-bit IEEE754 floats. The special power of `ArrayBuffer`s is that they are [transferable][transferables]. Transferables are data type that can be transferred instead of structurally cloned. Some data types like `ArrayBuffer` are _both_ cloneable _and_ transferable. Other types like `MessagePort` are only transferable and not cloneable. To let `postMessage()` know that you want to transfer a value rather than cloning it, you can provide a list of transferables as the second parameter for `postMessage()`. These values will be sent pretty much instantaneously, but this also means the original owner loses access to the contents.

```js
const buffer = getSomeArrayBuffer();
worker.postMessage(buffer, [buffer]);
// No access to the buffer’s data
console.assert(buffer.byteLength === 0);
```

With this out of the way, we can create 2 `Float32Array`s in our worker, one for the balls’ positions and one of the velocities. Each frame we can send a copy

### Pull model

[threejs]: https://threejs.org/
[mrdoob]: https://twitter.com/mrdoob
[oculus tweet]: https://twitter.com/DasSurma/status/1217065178803724289
[webxr spec]: https://immersive-web.github.io/webxr/
[three.js examples]: https://threejs.org/examples/
[ballshooter]: https://threejs.org/examples/webxr_vr_ballshooter.html
[prettier]: https://prettier.io/
[gist]: https://gist.github.com/surma/83878d60b1edb0bb7d0cfd46c8b8cc56
[when workers]: /things/when-workers/
[is postmessage slow]: /things/is-postmessage-slow/
[cds19 talk]: https://www.youtube.com/watch?v=7Rrv9qFMWNM
[arraybuffer]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
[typedarray]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
[transferable]: https://developer.mozilla.org/en-US/docs/Web/API/Transferable
