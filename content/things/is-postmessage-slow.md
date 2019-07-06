---json
{
  "title": "Is postMessage slow?",
  "date": "2019-07-04",
  "socialmediaimage": "",
  "live": false
}

---

No. It is not.

<!--more-->

What does “slow” even mean? [I said it before][snakeoil], and I will say it again: If you didn’t measure it, it is not slow, and even if you measure it, the numbers are pointless without context.

That being said, the fact that people will bring up their concerns about the performance of `postMessage()` every time I mention [Web Workers], means that there is collective understanding that `postMessage()` is bad. [My last blog post][when workers] on workers was [no different][moan], by the way.

Let’s try to figure out where this misconception comes from, put actual numbers to the performance of `postMessage()` and what you can do if after all of this, it is _actually_ still to slow for your _specific_ use-case.

## How postMessage works

TBD

## It’s about sending a message

Please stand back, I am going to use <span class="mirror" data-symbol="☠️">microbenchmarks</span>.

### The benchmark 

<figure>
  <img src="breadth-depth.svg" alt="Two JSON objects showing depth and breadth">
  <figcaption>Depth and breadth vary between 1 and 6. For each permutation, 1000 objects will be generated.</figcaption>
</figure>

The benchmark will generate objects with a specific “breadth” and “depth”. The values for breadth and depth lie between 1 and 6. **For each combination 1000 unique objects will be `postMessage()`’d from a worker to the main thread and the time it takes to do that is being measured**. The property names of these objects are random 16-digit hexadecimal numbers as a string, the values are either a random boolean, a random float or again a random string in the from of a 16-digit hexadecimal number. **The benchmark will measure the time it takes for the object to be sent from a worker the main thread via `postMessage()` and show the 95th percentile.**

I ran the benchmark across a couple of mobile devices and my iMac. Since the whole context of my [last blog post][when workers] was about low-end and feature phones, those benchmarks are the ones to pay most attention to.

<section class="carousell">
<div>
  <img src="nokia2-chrome.svg">
</div>
<div>
  <img src="nokia8110-firefox.svg">
</div>
<div>
  <img src="pixel3-chrome.svg">
</div>
<div>
  <img src="imac-chrome.svg">
</div>
<div>
  <img src="imac-firefox.svg">
</div>
<div>
  <img src="imac-safari.svg">
</div>
<div>
  <img src="ipad-safari.svg">
</div>
</section>

> **Note:** You can find the benchmark data, to code to generate it and the code for the visualization in [this gist][viz gist].

Two things to note here:

1. The Nokia 8110 runs a KaiOS version based on Firefox 48 from mid-2016. Firefox has probably shipped optimizations since then.
2. Since Spectre & Meltdown, all browsers disabled [SharedArrayBuffers] and reduced the resolution of timers like [`performance.now()`], which I am relying on here. Only Chrome was able to reenable SABs and timers, since they shipped [Site Isolation] to Chrome on desktop. More concretely, that means that browsers clamp the resolution of `performance.now()` to the following values:
    - Chrome (desktop): 5µs
    - Chrome (Android): 100µs
    - Firefox: 1ms (can be disabled with a flag)
    - Safari: 1ms

### What makes postMessage slow?

Before I took a closer look at each individual benchmark, I wanted to find out what the benchmark across browsers and devices have in common. It seemed to me that the **the time it takes to `postMessage()` a value correlates with its stringified size**. To increase my confidence in this statement, I modified the benchmark: I still generate all permutations of breadth and depth between 1 and 6, but all leaf properties have a string value of length between 16 bytes up to 2KiB:

<figure>
  <img src="correlation.svg" width="50%" alt="A graph showing the correlation between payload size and transfer time for postMessage">
  <figcaption>Transfer time has a strong correlation with the length of the string returned by <code>JSON.stringify()</code>.</figcaption>
</figure>

Even more important to note, however is the fact that **this correlation only becomes relevant for big objects**, and by big I mean anything over 100KiB. While correlation holds mathematically, the variance is much more noticeable for smaller values.

## How slow is postMessage?

If the benchmarks are supposed to allow us to draw _meaningful_ conclusions, we need to address the problem about what “slow” means. We need to quantify where we draw that line. Budgets are a helpful tool here, and I will once again go back to the [RAIL] guidelines to establish our budgets.

The smallest budget in RAIL is the animation budget at 16ms. Looking at the numbers from our devices, all the _reasonable_ (100KiB and below) payload sizes are within this budget. However, animations are by very definition UI work. **The UI thread is for UI work and for UI work only. If you find yourself needing to send data from the worker for every frame, you should consider moving the code to the main thread.** Additionally, if the data set you need to update your visuals for the next frame is this big, you should evaluate if one of the optimizations below can help you stay within your budgets more comfortably. 

TODO: Refer back to how postMessage blocks both threads and if you have animations, you can’t block for >16ms

In my experience, one of the worker’s core responsibilties is managing your app’s state object. As a result, you only end up changing your app’s state when the user interacts with your app. Unless that interaction is scrolling (which counts as an animation), the RAIL budget allocates 100ms to react to such a user interaction. This means that **even on the slowest devices, you can `postMessage()` objects up to 100KiB and stay within your budget.**

## Fasterrrrr

Now, for most apps this is more than enough budget to move the app logic to a worker. I will admit, however, that there might be setups where your objects are either really big or you need to send a lot of them at a high frequency. What can you do if vanilla `postMessage()` actually is too slow?

### Patching

In the case of state objects, the objects themselves can be quite big, but it’s often only a handful of deeply nested properties that change. **Instead of sending the entire new state object whenever something changed, we can record the changes and send a patchset instead.** [ImmerJS], a library for working with immutable objects, has the capability to generate such patchsets for us:

```js
// worker.js
immer.produce(stateObject, draftState => {
  // Manipulate `draftState` here
}, patches => {
  postMessage(patches);
});

// main.js
worker.addEventListener("message", ({data}) => {
  state = immer.applyPatches(state, data); 
  // React to new state
}
```

The patches that ImmerJS generates look like this, meaning that no matter how big the actual state object is, the amount that needs to get transferred stays comparatively small.

```json
[
  {
    "op": "remove",
    "path": [ "socials", "gplus" ]
  },
  {
    "op": "add",
    "path": [ "socials", "twitter" ],
    "value": "@DasSurma"
  },
  {
    "op": "replace",
    "path": [ "name" ],
    "value": "Surma"
  }
]
```

### Chunking

As I said, for state objects it’ _often_ only a handful of properies that change their value. But _sometimes_ it’s a lot. In the case of [PROXX], it can be a lot! The game state consists of a 2-dimensional array containing the game grid. Each cell contains whether it’s a black hole or a number, if it’s been revealed or if it’s been flagged:

```typescript
interface Cell {
  hasMine: boolean;
  flagged: boolean; 
  revealed: boolean;
  touchingMines: number;
  touchingFlags: number;
}
```

That means the biggest possible state object of 40 by 40 cells adds up to ~134KiB of JSON. Sending an entire state object is out of the question. But even patchsets ended up being too big: In some situation about 80% of the game field get revealed at once, which adds up to a patchset of about ~70KiB. When targeting feature phones, that is too much, especially as we might have animations running.

---


[Web Workers]: https://developer.mozilla.org/en-US/docs/Web/API/Worker
[moan]: https://twitter.com/dfabu/status/1139567716052930561
[snakeoil]: /things/less-snakeoil/
[when workers]: /things/when-workers/
[shared array buffers]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer 
[site isolation]: https://www.chromium.org/Home/chromium-security/site-isolation
[viz gist]: https://gist.github.com/surma/08923b78c42fab88065461f9f507ee96
[RAIL]: https://developers.google.com/web/fundamentals/performance/rail
[ImmerJS]: https://github.com/immerjs/immer
[PROXX]: https://proxx.app