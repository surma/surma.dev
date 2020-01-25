---json
{
"title": "Case study: Moving a Three.JS-based WebXR app off-main-thread",
"date": "2020-01-23",
"socialmediaimage": "social.png",
"live": false
}

---

Keeping the frame rate stable is literally vital for virtual reality applications. Off-main-thread architecture can help ensure that the frames keep shipping. **Warning:** This blog post contains the word “balls” a lot.

<!-- more -->

I recently [became the owner of an Oculus Quest][oculus tweet], and since the browser that comes with it has support for [WebXR][webxr spec], I thought it only sensible to play around with that API. I looked at the [Three.JS examples] and tried out the XR samples. Annoyingly, even the rather bare-bones [Ballshooter] was fun. However, I felt like it didn’t have enough balls. Time to start hacking!

<figure>
  <video src="emitChunk(/things/omt-for-three-xr/ballshooter-original.mp4)" muted loop controls></video>
  <figcaption>The original Ballshooter example from <code>threejs.org</code></figcaption>
</figure>

## Step 1: Run prettier

I ripped out the demo from the repository and couldn’t do anything until I ran [Prettier]. What were you _thinking_, [MrDoob][mrdoob]? (Just kidding). I refactored the code a bit to give me a bunch of top-level variables to fiddle with:

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

The next step is obviously to increase the number of balls:

```diff
- var ballCount = 200;
+ var ballCount = 500;
```

Running that example with an increased number of balls seemed to affect the framerate. The balls’ movements were jankier, but acceptable. However, the head tracking was affected by the same jank, making the game noticeably uncomfortable to use over longer periods of time. A quick trace confirms:

<figure>
  <img src="trace-original-500.png">
  <figcaption>The trace shows that each frame takes around 16.1ms, which is over budget. However, roughly 10ms of that are the purely computational physics.</figcaption>
</figure>

Looking at the trace, each frame takes around 16ms. Which in the normal web world would be fine, although definitely cutting it close. In the VR world however, we have different frame rates. The Oculus Quest specifically runs at 72Hz. Most VR headsets actually run at 90Hz, some even higher. **That means that we have 11.1ms per frame for VR** and the current code is blowing through that budget.

> **Note:** More experienced WebGL developers will feel the urge to point out that the example code does not make use of instanced rendering. That is correct and I’ll switch to instanced rendering later in the blog post.

This is the same problem I talked about in my [previous blog post on workers][when workers]: **The performance metrics of the device you run are not under your control and the amount of time your code takes to run is unpredictable.** This is a concern on the web as I have explained in that blog post, but it becomes a detrimental problem for virtual reality. An unsteady frame rate can cause nause for the user and will _render_ the app unusable. It is _vital_ to avoid dropping frames at all costs. How do we do that?

## Adding a worker

To nobody’s surprise, this is all just an excuse to talk some more about workers and off-main-thread architecture. As I proclaimed in [my Chrome Dev Summit 2019 talk][cds19 talk], the mantra is “the UI thread is for UI work only”. The UI thread will run Three.JS to render the game using WebGL and will use WebXR to get the parameters of the VR headset and the controllers. What should _not_ run on the UI thread are the physics calculations that make the balls bounce off the wall and off each other.

The physics engine is tailored to this specific app. It is effectively hard-coded to handle a number of balls of the same size in a fixed size room. The implementation is as straight forward as it is unoptimized. We keep all the balls’ positions and velocities in an array. Each ball’s velocity is changed according to gravity, each ball’s position is changed according to its velocity. We check all pairings of balls if they intersect, and if they do the balls are separated and their velocity is changed as if they bounced off of each other.

Moving this code to a worker is easily doable as it is purely computational and doesn’t make use of any APIs. Since we don’t have a `requestAnimationFrame()` in a worker, we will have to make it work with good old `setTimeout()`. We’ll run the physics simulation at 90 ticks per second to make sure we can deliver a fresh frame to the majority of VR devices.

> **Note:** `requestAnimationFrame` has been made available in Workers in Chrome, but even if all browsers had that, it would run at the framerate of the web renderer, not necessarily of the VR headset itself. This is something I’d love to see added to the WebXR API.

The next question is how we inform the UI thread of the new positions of the ball. We could take the naïve approach and just send a JavaScript array containing the positions for all balls for every frame. A quick estimation based on [the rule of thumb][is postmessage slow] reveals: Structured cloning an array of that size would put us at risk of blowing our frame budget at 60fps (let alone 72fps or even 90fps). And that’s just cloning time without any rendering. For a hot-path like this, structured cloning big objects is not going to cut it.

### ArrayBuffer

[`ArrayBuffer`][arraybuffer] are a continuous chunk of memory. Just a bunch of bits. Using [`ArrayBuffer` views][typedarray] you can interpret that chunk of memory in different ways. Using `Int8Array` you can interpret it as a sequence of 8-bit signed integers, using `Float32Array` you can interpret it as a sequence of 32-bit IEEE754 floats. Because `ArrayBuffer`s map to a continuous chunk of memory, they are extremely fast to clone.

> **Note:** I can already hear some people shout at me for not transferring the `ArrayBuffer`. In my very first implementation I actually did transfer the `ArrayBuffer`s and built a memory pool so I can reuse memory buffers. However, I realized that before sending the buffer over to the main thread I had to create a copy as I needed the positions to _remain_ in the worker for the next tick of the physics calculation. I tried letting the structured cloning algorithm take care of the copying rather than doing it myself and discovered that it performed just as well which allowed me to get rid of the memory pool.

With this out of the way, we can create 2 `Float32Array`s in our worker, one for the balls’ positions and one for the velocities.

### Pull model

My first attempt would let the physics calculation run and the main thread would pull the latest positions from the worker whenever it wants to ship a frame. This turned out to be a bad idea. Remember: The whole point is that we want the main thread to be unblocked, always able to ship a frame to keep the frame rate steady. With a pull model the main thread occasionally had to wait until the worker was available to reply to the main thread’s request. **The main thread should never have to wait for anything.**

### Push model

Instead a push model is much more appropriate here. The main thread will register a callback with the worker to receive the updated positions. The rendering loop will just use whatever data is available. If the main thread hasn’t received an update since the last frame, the balls will not move and appear to be frozen in place. That’s not ideal, but allows us to at least incorporate fresh data from the WebXR API in case the user has moved and rerender the scene. This is crucial to avoid nausea.

Overall, the worker looked like this:

```js
import * as Comlink from "comlink";

class BallShooter {
  constructor() {
    this._positions = new Float32Array(3 * this._numBalls);
    this._velocities = new Float32Array(3 * this._numBalls);
    // Prepare views onto the main buffers for each ball
    this._balls = Array.from({ length: this._numBalls }, (_, i) => {
      return {
        index: i,
        position: this._positions.subarray(i * 3 + 0, i * 3 + 3),
        velocity: this._velocities.subarray(i * 3 + 0, i * 3 + 3)
      };
    });
    this._init();
  }

  setCallback(cb) {
    this._cb = cb;
  }

  _init() {
    // Init balls’ position and velocity
    // with random values
  }

  start() {
    // Schedule _update() at 90Hz
  }

  getPositions() {
    return this._positions;
  }

  _update() {
    this._doPhysics(delta / 1000);
    this._cb(this.getPositions());
  }

  _doPhysics(delta) {
    // Take a wild guess
  }
}

Comlink.expose(BallShooter);
```

A simplified version of the main script looks like this:

```js
import * as THREE from "three";
import * as Comlink from "comlink";

const worker = new Worker("./worker.js");
const BallShooter = Comlink.wrap(worker);
let positions;
// ... more variables

init().then(() => animate());

async function init() {
  ballShooter = await new BallShooter();
  scene = new THREE.Scene();

  // ... ThreeJS stuff ...

  positions = await ballShooter.getPositions();
  updateBallPositions();
  await ballShooter.setCallback(
    Comlink.proxy(buffer => {
      positions = buffer;
    });
  );
}

function updateBallPositions() {
  for (var i = 0; i < room.children.length; i++) {
    var object = room.children[i];
    object.position.x = positions[i * 3 + 0];
    object.position.y = positions[i * 3 + 1];
    object.position.z = positions[i * 3 + 2];
  }
}

function animate() {
  renderer.setAnimationLoop(render);
  ballShooter.start();
}

async function render() {
  updateBallPositions();
  renderer.render(scene, camera);
}
```

The physics calculations run in a worker, ensuring that our framerate remains stable and our VR users don’t throw up. However, the balls just fall down and the controllers do nothing, yet.

### Accessing the controllers

To be able to shoot balls, the worker needs to know the positions and rotations of the controllers so it can update a ball’s position and velocity accordingly. Because the WebXR API is not available in a worker, we have to forward that data ourselves.

On the main thread we just send the position and quaternion of each controller on every frame as an array. Because these are arrays with 3 or 4 elements, the structured cloning time is negligible. If it does become a problem, we could switch to `ArrayBuffer`s here as well.

```js
async function init() {
  // ...
  controller1.userData.id = 0;
  controller1.addEventListener("selectstart", onTriggerDown);
  controller1.addEventListener("selectend", onTriggerUp);
  controller2.userData.id = 1;
  controller2.addEventListener("selectstart", onTriggerDown);
  controller2.addEventListener("selectend", onTriggerUp);
  // ...
}

function onTriggerDown() {
  ballShooter.startShootingGun(this.userData.id);
}

function onTriggerUp() {
  ballShooter.stopShootingGun(this.userData.id);
}

function updateController(controller) {
  ballShooter.setGun(
    controller.userData.id,
    controller.position.toArray(),
    controller.quaternion.toArray()
  );
}

async function render() {
  updateController(controller1);
  updateController(controller2);
  // ...
}
```

In the worker, we need to handle these signals accordingly:

```js
class BallShooter {
  constructor() {
    // ...
    this.shootingRate = 10;
    this._guns = [
      {
        shooting: false,
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion()
      },
      {
        shooting: false,
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion()
      }
    ];
    // ...
  }

  startShootingGun(id) {
    this._guns[id].shooting = true;
  }

  stopShootingGun(id) {
    this._guns[id].shooting = false;
  }

  setGun(id, position, quaternion) {
    this._guns[id].position.set(...position);
    this._guns[id].quaternion.set(...quaternion);
  }

  _update(delta) {
    this._doPhysics(delta / 1000);
    this._shootBalls(delta / 1000);
    this._cb(this._positions);
  }

  _shootBalls(delta) {
    for (const gun of this._guns) {
      if (!gun.shooting) {
        continue;
      }
      // Move a ball to the controller’s position
      // and set the ball’s velocity along the
      // controller’s axis.
    }
  }
}
```

> **Note:** Another feature request for the WebXR API. I’d love to get access to the positional data from a worker, too. Not sure if that is easily possible.

We have now fully replicated the functionality of the original game, where the physics calculations are isolated to a worker.

### Running it all

With all of that in place, we can play the game just as before. But how does it behave when increasing the number of balls to, let’s say, 2000? What you get I’d call unejoyable but nausea-free:

<figure>
  <video src="emitChunk(/things/omt-for-three-xr/ballshooter-2k.mp4)" muted loop controls></video>
  <figcaption>The game reacts to head movements immediately, even if the balls are frozen in place for extended periods of time. </figcaption>
</figure

Looking at a trace quantifies what we have just seen: We are _just barely_ inside our main thread budget and the physics just take _way_ too long, but are isolated.

<figure>
  <img src="trace-omt-main.png">
  <figcaption>At 72fps, our main thread budget is 13.88ms. With the increase number of balls, we are <em>just</em> about managing.</figcaption>
</figure>

<figure>
  <img src="trace-omt-worker.png">
  <figcaption>One tick of the physics “engine” takes about 148ms, which is equivalent to ~6fps.</figcaption>
</figure>

I won’t go into optimizing the physics. There is a lot of material out there on this topic. But what we _should_ take a look at is the main thread budget. There’s pretty much no headroom left, and if the Oculus Quest was running at 90Hz, we’d be screwed.

## Instanced rendering

Currently, each ball is drawn individually, causing a large number of draw calls. This is one of the more common mistakes to make WebGL perform badly. To batch similar objects into one draw call, you can use a technique called [instanced rendering][drawarraysinstanced]. ThreeJS now has support for this technique with their new [`InstancedMesh`][instancedmesh]. Conveniently, WebGL and consequently `InstancedMesh` works with `ArrayBuffer`s, allowing us to pass the data we get from the worker straight to WebGL, without having to loop over it.

```js
async function init() {
  // ...
  const geometry = new THREE.IcosahedronBufferGeometry(radius, 2);
  const balls = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshLambertMaterial({
      color: 0xff8000
    }),
    ballCount
  );
  // ThreeJS doesn't support frustrum culling for InstancedMesh yet.
  balls.frustumCulled = false;
  room.add(balls);

  ballShooter.setCallback(positions => {
    balls.instanceMatrix.array.set(positions);
    balls.instanceMatrix.needsUpdate = true;
  });
  // ...
}
```

One additional adjustment is the fact that `InstanceMesh` expects an array of 4x4 matrices instead of just the position. To accommodate this, we need to grow buffers we send from the worker to ~5 times the original size — from 3 floats per ball to 16 floats per ball. Luckily, this has no measurable impact on performance due to how fast `ArrayBuffer`s are to copy. At the same time, the switch to instanced rendering freed up our main thread dramatically (which will not surprise anyone with GL experience):

<figure>
  <img src="trace-omt-main-instanced.png">
  <figcaption>Rendering 2000 balls costs 1ms on the Oculus Quest when using instanced rendering.</figcaption>
</figure>

At this point the main thread is free to render a more complex scene, more balls or whatever you want to do. We will have to optimize the way our physics calculations are done to make it enjoyable, but that’s a story for another time.

If you want to play off-main-thread version of this game, you can check it out [here].

## Conclusion

I think I had an interesting realization throughout this experiment: If structured cloning is a bottleneck for you, switching to transferables is _not_ the only alternative. `ArrayBuffer`s are so fast to copy that they can make the cost of structured cloning disappear. Only if your buffers are _really_ bug will you see a difference between copying and transferring.

Gaming in general but VR specifically doesn’t only seem to benefit from an off-main-thread architecture, it seems to me that it is a requirement. Especially for VR it is absolutely critical to keep the render loop going to avoid making your users unwell. With more and more VR devices coming to the market, the spectrum of performance metrics will widen, just like it did for mobile phones. The amount of time of your code takes will become more and more unpredictable. Off-main-thread architecture can help you make your app more resilient.

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
[drawarraysinstanced]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawArraysInstanced
[instancedmesh]: https://threejs.org/docs/index.html#api/en/objects/InstancedMesh
