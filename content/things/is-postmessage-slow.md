---json
{
  "title": "Is postMessage slow?",
  "date": "2019-07-04",
  "socialmediaimage": "",
  "live": false
}

---

No, not really. (It depends.)

<!--more-->

What does “slow” mean? [I said it before][snakeoil], and I will say it again: If you didn’t measure it, it is not slow, and even if you measure it, the numbers are pointless without context.

That being said, the fact that people will bring up their concerns about the performance of `postMessage()` every time I mention [Web Workers], means that there is collective understanding that `postMessage()` is bad. [My last blog post][when workers] on workers was [no different][moan], by the way.

Let’s put actual numbers to the performance of `postMessage()` and see where you risk blowing your budets and what you can do if it is still too for your use-case.

## How postMessage works

Before we start measuring, we need to understand what it is we are measuring and which part we want to measure. Otherwise, [we’ll end up gathering meaningless data][deep copy] and drawing meaningless conclusions.

`postMessage()` is part of the [HTML spec]. As I mentioned in my [deep-copy post][deep copy], `postMessage()` relies on structrued cloning to copy the message from one realm to another. But if you actually look at [the steps in the spec to `postMessage()` a value][post message steps] from one realm to another, you can see that structrued cloning itself is a two-step process:

1. `StructuredSerialize()` the message
2. Queue a task in the receiving realm, that will execute the following steps:
    1. Run `StructuredDeserialize()` on the serialized message
    2. Create a `MessageEvent` and dispatch it on the receiving port

This is a simplification and probably technically incorrect, but it catches the spirit of the algorithm. For example, `StructuredSerialize()` and `StructuredDeserialize()` are not real functions in the sense that they are not exposed via JavaScript ([yet][exposing structured clone]). But for now, **you can think of `StructuredSerialize()` and `StructuredDeserialize()` as smarter versions of `JSON.stringify()` and `JSON.parse()`**, respectively. Smarter how? It handles things like cyclical data structures and can also transfer built-in data types like `Map`, `Set` and `ArrayBuffer`. These smarts come at a cost, of course, so structured cloning an object is generally slower than `JSON.parse(JSON.stringify())`’ing it. Let’s put this little fun fact off to the side for now.

Something that the algorithm above doesn’t spell out explicitly is the fact that **serialization blocks the sending realm, while deserialization blocks the receiving realm.** And there’s more: It turns out that both Chrome and Safari defer running `StructuredDeserialize()` until you actually access the `.data` property on the `MessageEvent`. Firefox on the other hand deserializes right before dispatching the event.

> **Note:** Both of these behaviors _are_ in fact spec-compatible and perfectly valid. [I openend a bug with Mozilla][ff bug], asking if they are willing to align their implementation, as it puts the developer in control when to take the “performance hit” of deserializing big payloads.

With that in mind, we have to make a choice _what_ to benchmark: We could measure how much time it takes to send a message from a worker to the main thread. However, that number would capture the time for both serialization and deserialization, each of which are happening in different realms. The time the main thread is actually blocked by deserialization will be shorter than the numbers from the benchmark. Remember: **This whole spiel with workers is motivated by wanting to keep the main thread free and responsive.** Alternatively, we could limit the benchmarks to Chrome and Safari and measure how long it takes to access te `.data` property to measure `StructuredDeserialize()` in isolation, which would mean I would have to ignore Firefox. I also haven’t found a way to measure `StructuredSerialize()` in isolation, short of running a trace. Neither of these choices are ideal, but in the spirit of building resilient web apps, **I decided to run the end-to-end benchmark to provide an _upper bound_ for the cost of `postMessage()`.**

## Raw data

Armed with a conceptual understanding of `postMessage()` and the determination to measure, I shall use <span class="mirror" data-symbol="☠️">microbenchmarks</span>. Please mind your head.

### Benchmark 1: How long does sending a message take?

<figure>
  <img src="breadth-depth.svg" alt="Two JSON objects showing depth and breadth">
  <figcaption>Depth and breadth vary between 1 and 6. For each permutation, 1000 objects will be generated.</figcaption>
</figure>

The benchmark will generate an object with a specific “breadth” and “depth”. The values for breadth and depth lie between 1 and 6. **For each combination of breadth and depth, 1000 unique objects will be `postMessage()`’d from a worker to the main thread**. The property names of these objects are random 16-digit hexadecimal numbers as a string, the values are either a random boolean, a random float or again a random string in the from of a 16-digit hexadecimal number. **The benchmark will measure the time and calculate the 95th percentile.**

Since the whole context of my [last blog post][when workers] was about low-end phones, the Nokia 2 benchmark is probably the most interesting one. I also ran the benchmark across multiple browsers on my MacBook as I can’t assume that structured cloning is implemented the same everywhere.

<section class="carousell">
<div>
  <img src="nokia2-chrome.svg">
</div>
<div>
  <img src="pixel3-chrome.svg">
</div>
<div>
  <img src="macbook-chrome.svg">
</div>
<div>
  <img src="macbook-firefox.svg">
</div>
<div>
  <img src="macbook-safari.svg">
</div>
</section>

> **Note:** You can find the benchmark data, to code to generate it and the code for the visualization in [this gist][viz gist].

The benchmark data from the Pixel 3 and especially Safari looks a bit odd, doesn’t it? When Spectre & Meltdown was discovered, all browsers disabled [SharedArrayBuffers] and reduced the precision of timers like [`performance.now()`], which I am relying on here. Only Chrome was able to revert most these changes since they shipped [Site Isolation] to Chrome on desktop. More concretely, that means that browsers clamp the precision of `performance.now()` to the following values:
    - Chrome (desktop): 5µs
    - Chrome (Android): 100µs
    - Firefox: 1ms (can be disabled with a flag, which I did)
    - Safari: 1ms

### Benchmark 2: What makes postMessage slow?

It seems the complexity of the object has a strong influence over how long it takes to serialize and deserialize an object. Not really that surprising. The data above seems to imply that the size of the JSON representation of an object is a good indicator for how long it takes to transfer that object.

To verify, I modified the benchmark: I still generate all permutations of breadth and depth between 1 and 6, but all leaf properties have a string value of length between 16 bytes up to 2KiB:

<figure>
  <img src="correlation.svg" alt="A graph showing the correlation between payload size and transfer time for postMessage">
  <figcaption>Transfer time has a strong correlation with the length of the string returned by <code>JSON.stringify()</code>.</figcaption>
</figure>

Even more important to note, however is the fact that **this correlation only becomes relevant for big objects**, and by big I mean anything over 100KiB. While the correlation holds mathematically, the variance is much more impactful at smaller payloads.

### Benchmark 3: Serialization vs Deserialization



## Evaluation: It’s about sending a message

That’s a lot of data, but it’s meaningless if we don’t contextualize it. If we want to draw _meaningful_ conclusions, we need to define what “slow” means. We need to quantify where we draw that line. Budgets are a helpful tool here, and I will once again go back to the [RAIL] guidelines to establish our budgets.

In my experience, one of the worker’s core responsibilties is managing your app’s state object. As a result, you only end up changing your app’s state when the user interacts with your app. This means that **even on the slowest devices, you can `postMessage()` objects up to 100KiB and stay within your budget.**

This changes when you JS-driven animations running. The RAIL budget for animations is 16ms, as the visual needs to get update every frame. As such we send any messages from the worker that would block the main thread for longer than that. Looking at the numbers from our benchmarks, everything up to 10KiB will not pose a risk to your animation budget. **This is a strong reason to prefer CSS animations and transitions over JavaScript-driven animations.** CSS animations and transitions run on a separate thread and are not affected by a blocked main thread. 

## Fasterrrrr

In my experience, `postMessage()` doesn’t become the bottleneck for most apps that are adopting an off-main-thread architecture. I will admit, however, that there might be setups where your objects are either really big or you need to send a lot of them at a high frequency. What can you do if vanilla `postMessage()` is too slow for you?

### Patching

In the case of state objects, the objects themselves can be quite big, but it’s often only a handful of deeply nested properties that change. **Instead of sending the entire new state object whenever something changed, we can record the changes and send a patchset instead.** For example: [ImmerJS], a library for working with immutable objects, provides the capability to generate such patchsets for us:

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

As I said, for state objects it’ _often_ only a handful of properies that change their value. But _sometimes_ it can also be a lot. In the case of [PROXX], we had one of these situations where the patchset was quite big! The game state consists of a 2-dimensional array containing the game grid. Each cell stores whether it’s a black hole or a number, if it’s been revealed or if it’s been flagged:

```typescript
interface Cell {
  hasMine: boolean;
  flagged: boolean; 
  revealed: boolean;
  touchingMines: number;
  touchingFlags: number;
}
```

That means the biggest possible grid of 40 by 40 cells adds up to ~134KiB of JSON. Sending an entire state object is out of the question. But even patchsets ended up being too big: In some situation about 80% of the game field get revealed at once, which adds up to a patchset of about ~70KiB. When targeting feature phones, that is too much, especially as we might have animations running.

In these situations you can make an architectural decision: Can you reasonably do partial updates? Patchsets are often an array of single patches. What happens if you only apply patch 1-10 out of 100? This is what we do in PROXX. The worker iterates over the entire grid to figure out which fields need to be changed and collects them in a list. If that list grows over a certain threshold, we send that “chunk” to the main thread immediately and then continue iterating the game field. The patchsets are so small that the cost of `postMessage()` is negligible. If the main thread can process multiple message events within a single frame, the updates get coalesced. If the main thread can’t keep up (like on a Nokia 8110), the chunking disguises as a reveal animation.

<figure>
  <video src="proxx-reveal.mp4" muted autoplay loop></video>
  <figcaption>By chunking the patchsets, PROXX reduces `postMessage()` cost per frame and hides it in a reveal animation.</figcaption>
</figure>

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
[deep copy]: /things/deep-copy/
[HTML spec]: https://html.spec.whatwg.org/multipage/
[post message steps]: https://html.spec.whatwg.org/multipage/web-messaging.html#message-port-post-message-steps
[exposing structured clone]: https://github.com/whatwg/html/pull/3414
[ff bug]: https://bugzilla.mozilla.org/show_bug.cgi?id=1564880