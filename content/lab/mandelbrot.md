---json
{
  "title": "Workerized Mandelbrot with SABs",
  "date": "2017-10-10"
}
---

This experiment is a real-time, interactive Mandelbrot renderer using [SharedArrayBuffers][SharedArrayBuffer], [Atomics] and [Web Workers][Web Worker].

<!-- more -->

The interesting thing about this experiment is that it only sends one initial `postMessage()` to share the `SharedArrayBuffer` with the Worker. After that, I rely on [Atomics] to put the worker to sleep and to signal when the pixels need to get re-rendered. The zoom level and coordinates are encoded into the SAB as well.

On the main thread, a `requestAnimationFrame()` loop draws the SAB to screen every frame. This means you can watch the Worker do its work.

<!-- more -->

[SharedArrayBuffer]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
[Atomics]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics
[Web Worker]: https://developer.mozilla.org/en-US/docs/Web/API/Worker