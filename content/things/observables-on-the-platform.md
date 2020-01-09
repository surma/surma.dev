---json
{
"title": "Observables on the platform",
"date": "2020-01-09",
"socialmediaimage": "social.png",
"live": false
}

---

They are already there. I think. Streams certainly feel like they fill that gap quite nicely.

<!--more-->

> **Disclaimer:** I am not experienced with reactive programming or the libraries that enable this pattern. The library I am introducing in this blog post is not supposed to compete with any of these libraries, but is merely an experiment if streams can be used as an underlying primitive. The communities around these libraries deserve a lot of credit for bringing reactive programming to the web and I benefitted massively from their experience as I built and wrote this. I am standing on the shoulders of giants here.

**TL;DR:** Streams and observables are very similar. Their biggest difference seems to be that streams can deliver their data only once and that streams do so asynchronously. Writing a [demo app][dof tool] with my [stream-based observables library][ows] instead of RxJS makes me think that these differences don’t really matter when it comes to writing web apps. Go try it for yourself!

## Observables? Reactive Programming?

The Reactive Programming (RP) paradigm is not new and has enjoyed popularity in many different genres of programming. For example Android folks, especially since the introduction of Kotlin, have seen a rise in popularity around RP. I have also noticed some game engines experimenting with RP. On the web there have been a number of attempts to enable reactive programming. [RxJS] and [CycleJS] are front of mind to me. More recently, [Svelte 3][svelte] is trying to establish [a slightly different take on reactive programming][svelte 3 reactivity].

Reactive programming in general as well as these specific implementations are well covered on the web, so I won’t write yet another introduction to RP. But I want to make sure we are on the same page. According to [Wikipedia][wiki rp], “reactive programming is a _declarative_ programming paradigm concerned with _data streams_ and the _propagation of change_.” (Emphasis mine.) An “observable” is a type on which you can register “observers”, as defined in the [observer pattern] in [the GoF book]. For the time being, you can think of an observer as a callback in JavaScript land:

```js
myButton.addEventListener("click", myClickHandler);
```

In this example, `myClickHandler` would be the observer, while `myButton` is an observable. Kinda. The differences (as I perceive them), are subtle but important:

- An observable is a single stream of data. `myButton` here has multiple “streams”, one for each event type. So one for clicks, one for moving the mouse, one for key presses etc.
- A stream implies an input, an output and an order. Event listeners don’t have an output as the return value of an event listener is discarded. And if the event handler is asynchronous, the next event of the same type can get processed despite the previous event one not having finished processing.

> **Note:** As I said before, there are multiple libraries that employ the RP pattern. For the remainder of this blog post, I am going to focus on [RxJS] to keep the blog post clear and because their documentation was a major source of information for me.

RxJS implements an `Observable` type and also ships many utility functions, for example to turn that button into a proper observable:

```js
import { fromEvent } from "rxjs";

const observable = fromEvent(myButton, "click");
observable.subscribe(ev => {
  /* ... */
});
```

## Sugar for streams

Let’s take a [the introduction that RxJS gives][rxjs observable]:

<figure>
  <img src="table.png" alt="A table describing observables as push-based data structures that can deliver multiple values.">
  <figcaption>RxJS’ introduction categorizes functions, promises, iterators and observables by 2 dimensions: Their ability to deliver a single or multiple values, and whether that value is delivered on demand (pull) or just-in-time (push).</figcaption>
</figure>

I felt like [WHATWG Streams] (or just “streams”) fit in the same gap as observables. Even Wikipedia’s definition of RP mentions “streams of data”. Then why are streams and observables mentioned together so rarely? Why is there a [TC39 proposal for observables][tc39 observables] when we have streams? Why is RxJS not built on top of streams? Am I missing something?

Streams arguably more flexible and powerful than observables. Streams are separated into data sources, data sinks and data transformers. Streams can model both push-based and pull-based data sources. But as so often, more power and flexibility requires more control and causes a low-level API design rather than a high-level one. So the vanilla API of streams is less convenient than observables. For example, the click event stream from the example above would look like this:

```js
const stream = new ReadableStream({
  start(controller) {
    myButton.addEventListener("click", ev => controller.enqueue(ev));
  }
});

stream.pipeTo(
  new WritableStream({
    write(ev) {
      /* ... */
    }
  })
);
```

Definitely too noisy to be practical. But does that warrant a completely new API with its own TC39 proposal? Maybe some sugar will be enough.

### Observables _with_ streams

To reduce the noise, I decided to write a little proof-of-concept library that models observables with streams as its underlying type. Not only would this be a fun exercise, but it will allow me to explore the differences between RxJS’ take on observables and mine. It’s called [`observables-with-streams`][ows] (or “ows”) and published as a package npm.

With this library in place, the above example can be simplified:

```js
import { fromEvent, subscribe } from "observables-with-streams";

const owsObservable = fromEvent(myButton, "click");
ows.pipeTo(
  subscribe(v => {
    /* ... */
  })
);
```

At least in terms of syntax, that is pretty comparable, wouldn’t you agree? And that's no coincidence, as I used RxJS’ documentation as my reference. The RxJS folks spent a lot of time to battle-test and refine their APIs. It seemed like a good idea to mirror their behaviors and use what has already been tried and tested.

If you want to know which operators ows currently provides, take a look at the [documentation][ows documentation]. At this point also a massive “thank you” to [Tiger Oakes (@not_woods)][not_woods] who wrote a good chunk of the documentation!

### Operators

Just having a different syntax to subscribe to events is not really that interesting, though. What makes RP really powerful is the ability to encapsulate individual steps of data processing and to connect multiple observables into a network of data streams. RxJS calls these units of functionality “operators”.

Operators take an observable and return a new observable, giving the operator a chance to mangle or transform the data that the original observable emits. This can be a basic transformation like a `map` or `filter` which you might know from Arrays. But the transformation can also be more complex like debouncing high-frequency events with `debouce`, flattening higher-order observables (an observable of observables) into a first-order observable with `concatAll` or combining multiple observables into one with `combineLatestWith`.

Here is a RxJS example using a debounce operator:

```js
import { fromEvent } from "rxjs";
import { debounceTime } from "rxjs/operators";

fromEvent(myButton, "click")
  .pipe(debounceTime(100))
  .subscribe(ev => {
    /* ... */
  });
```

And here is one with ows:

```js
import { fromEvent, debounce, subscribe } from "observables-with-streams";

fromEvent(myButton, "click")
  .pipeThrough(debounce(100))
  .pipeTo(
    subscribe(v => {
      /* ... */
    })
  );
```

## Streams vs. Observables

These examples above _look_ like equivalent code. But do they actually behave the same or is there a difference between observables and streams? Here is one example where two seemingly equivalent programs behave differently:

```js
import { Observable } from "rxjs";

const rxObservable = new Observable(subscriber => {
  setTimeout(() => {
    subscriber.next("hello world");
    subscriber.complete();
  }, 1000);
});

setTimeout(() => {
  rxObservable.subscribe(v => console.log(v));
}, 2000);
```

This code written with RxJS will exhibit the following behavior:

- Nothing for 3 seconds
- Logs `"hello world"`

Let’s compare this to the behavior of streams:

```js
import { fromNext, EOF, subscribe } from "observables-with-streams";

const owsObservable = fromNext(next => {
  setTimeout(() => {
    next("hello world");
    next(EOF);
  }, 1000);
});

setTimeout(() => {
  owsObservable.pipeTo(
    subscribe(v => console.log(v))),
  );
}, 2000);
```

This ows example will do the following:

- Nothing for **2 seconds**
- Logs `"hello world"`

So the ows example waits one second _less_ until it logs something. This difference stems from the fact how these two systems handle their data sources: **RxJS runs the code that generates the data (the callback passed to `new Observable()`) once a subscriber appears. Streams run that code immediately, independently of data sinks.** The data is already buffered up by the time the `subscribe()` call is executed.

### Single subscribers vs. multiple subscribers

The difference above implies a second, arguably more important difference. Let’s look at another comparison:

```js
import { from } from "rxjs";

const rxObservable = from([1, 2, 3]);
rxObservable.subscribe(v => console.log(`Subscriber 1: ${v}`));
rxObservable.subscribe(v => console.log(`Subscriber 2: ${v}`));
```

To achieve the same behavior with ows, we have to write slightly different code:

```js
import { fromIterable, subscribe } from "observables-with-streams";

const owsObservable = fromIterable([1, 2, 3]);
const [o1, o2] = owsObservable.tee(); // !!!
o1.pipeTo(subscribe(v => console.log(`Subscriber 1: ${v}`)));
o2.pipeTo(subscribe(v => console.log(`Subscriber 2: ${v}`)));
```

Observables will create a new data source for every subscriber. Streams _wrap_ a data source rather than creating it. If no sink is present, it gets buffered up. However, once an item has been consumed, late subscribers will not get to see that item. If you want for two subscribers to process the same items, you have to explicitly make a copy of the stream, for example by using `tee()`. This will consume the original stream and return two new ones that will output the same data as the original stream.

This design choice makes a lot of sense considering what WHATWG streams were designed around: network traffic. WHATWG Streams are most prominently used in the Fetch API to handle both the request body as well as the response body (i.e. upload and download payloads). In these scenarios, data that has been sent is sent. These bodies can be quite large so no system should keep a copy of the data around by default, unless explicitly instructed to do so.

### Microtask boundaries

When talking to [Jake Archibald] about this, he pointed out that there might be a difference in task timing. And of course, he turned out to be right. What a jerk.

Here’s two more pieces of code that _look_ the equivalent, but behave differently:

```js
import { Observable } from "rxjs";

new Observable(subscriber => {
  console.log("before");
  subscriber.next("value");
  console.log("after");
}).subscribe(value => {
  console.log("received:", value);
});
```

Running this RxJS code, you will see the following logs:

- `before`
- `received: value`
- `after`

```js
import { fromNext, subscribe } from "observables-with-streams";

fromNext(next => {
  console.log("before");
  next("value");
  console.log("after");
}).pipeTo(
  subscribe(value => {
    console.log("received:", value);
  })
);
```

With ows, you will see these logs:

- `before`
- `after`
- `received: value`

To put it in a sentence: **RxJS observables deliver their values _synchronously_ to subscribers. Streams run their processing steps in a microtask, making them _asynchronous_.**

## ows for app development

Now that I had established where streams (and by extension ows) work differently than RxJS, I was wondering if these differences make ows impractical for writing web apps. Time to write a little example app. Luckily, I had an itch that I needed to scratch:

When you take a picture with your camera, the camera needs to focus on a subject. The “focus point”, the point in space that the camera is focusing on, is often shown on the screen of your camera. But not only that specific point is in focus. Subjects closer to the camera (and subjects further away) can also appear sharp on the picture that you take, depending on _how much_ they are deviating from the focus point. The region that subjects can move around in and still remain in focus is called the “Depth of Field”, or DoF for short. Its size depends on a number of things: Focal length and aperture of the lens, subject distance and sensor size of the camera to begin with. There a number of apps out there that calculate the DoF for you based on these variables, but some have a disappointing UX or only expose a subset of the data I am interested in.

As any self-respecting web developer who technically had other, more pressing responsibilities, I procrastinated by writing my own app. The tool that came out of this effort is called [DoF Tool]. Another uninspiring name. DoF Tool is [open source][dof source] and makes use of [observables-with-streams][ows] for all of the UI and user interactions. ows is highly tree-shakable, so it should be used with a bundler. For DoF Tool I’m using [Rollup]. However, if you just want to take ows for a quick spin to try it out, you can include it from a CDN like [JSDelivr] as one big bundle:

```html
<script src="https://cdn.jsdelivr.net/npm/observables-with-streams@latest/dist/really-big-bundle.js"></script>
<script>
  const myButton = document.querySelector("...");
  ows.fromEvent(myButton, "click").pipeThrough(ows.map(/* ... */));
  // ...
</script>
```

The overall pattern I ended up with in DoF Tool is the following:

```js
// Rollup is smart enough to tree-shake despite
// the * import.
import * as ows from "observables-with-streams";

ows
  .combineLatest(
    // Aperture slider
    ows
      .fromAsyncFunction(async () => {
        const slider = memoizedQuerySelector("#aperture scroll-slider");
        slider.value = (await getLastValueFromIdb("aperture")) || 2.8;
        return ows.fromInput(slider);
      })
      .pipeThrough(ows.concatAll()),
    // Focal length slider
    ows
      .fromAsyncFunction(async () => {
        const slider = memoizedQuerySelector("#focal scroll-slider");
        slider.value = (await getLastValueFromIdb("focal")) || 50;
        return ows.fromInput(slider);
      })
      .pipeThrough(ows.concatAll())
    // ... other inputs
  )
  .pipeThrough(ows.map(calculateFocalPlanes))
  .pipeThrough(ows.map(calculateFieldOfView))
  .pipeThrough(ows.forEach(adjustDOM))
  // Only store changes in idb every second
  .pipeThrough(ows.debounce(1000))
  .pipeThrough(ows.forEach(storeValuesInIDB))
  .pipeTo(ows.discard());
```

I have to say: I enjoyed writing an app this way. And ows help up very well. I think the ows experiment is a success. I didn’t encounter any problems related to the differences outlined above. Now, I know that this is not a very complex app so this verdict might not hold up at scale. YMMV. I’d love to hear from some more experienced reactive programmers what they think.

### Performance

Maybe somewhat surprisingly, I did not do any benchmarks. While I think there’s a good chance that RxJS will perform better in a benchmarking scenario, I have grown skeptical of the relevance of those kinds of benchmarks. The app performs well on a wide spectrum of devices (including the Nokia 2!), and that’s all that matters to me in the end. I was also more interested in comparing capabilities and developer experience first before jumping straight into the performance rabbit hole.

### Library size & cross-browser support

ows uses `ReadableStream` as its basic type for observables, and `ReadableStream` is available in all major browsers. As a result, ows doesn't have to ship an implementation of the fundamental type itself. The entire ows library (the `really-big-bundle.js` version) currently weighs in at 2KiB after gzip.

However, operators are implemented as `TransformStreams` and sinks as `WritableStreams`, [the support for which is more lacking][streams support]. At the time of writing, only Blink-based browsers have full support for _all_ stream types. Firefox supports neither `WritableStreams`, `TransformStream` nor the `pipeTo()` or `pipeThrough()` methods. Safari is also lacking support for `WritableStream`.

To run ows in these browsers, you’d need to load a polyfill, like [Mattias Buelens’][mattiasbuelens] excellent [`web-streams-polyfill`][web-streams-polyfill], which adds a whopping 20KiB after gzip. While that is a lot, this additional weight will automatically go away when browsers catch up.

Why is that polyfill so big? As I mentioned earlier, streams are a low-level primitive with lots of capabilities under the hood. Streams can propagate backpressure. This allows a data sink to signal when it is backed up and would rather not receive any new data. This is not only useful but essential for efficient data transfer over network connections. The spec also contains a subtype for each stream that allows reading data straight into an `ArrayBuffer` for increased memory-efficiency. All these things have to be included in a proper polyfill even though they are not required to build an observable.

### Loading the polyfill

_If_ you wanted to use ows (it’s just an experiment, remember?), make sure to only load the polyfill if the browser requires it. You’d want to make sure that your app’s payload goes down if and when browsers catch up, without having to re-deploy. Here’s how I’m doing that in DoF Tool:

> **Note:** Currently, due to some requirements in the spec, you have to use nothing from the polyfill or use all 3 types from the polyfill. You can’t mix-and-match. There is an [issue](https://github.com/MattiasBuelens/web-streams-polyfill/issues/20) for that.

```js
import { init } from "./main.js";

(async function() {
  const hasReadableStream = typeof ReadableStream !== "undefined";
  const hasWritableStream = typeof WritableStream !== "undefined";
  const hasTransformStream = typeof TransformStream !== "undefined";

  if (!hasReadableStream || !hasWritableStream || !hasTransformStream) {
    await import("web-streams-polyfill/dist/polyfill.es2018.mjs");
  }
  init();
})();
```

Note that I am _statically_ importing my app’s main code but expose it wrapped in an `init` function. This way the app starts way quicker when it can skip the polyfill. If we had [top-level await], this would be even simpler to write.

## Conclusion

Getting my feet wet with reactive programming was really fun. If you haven’t tried it, I’d recommend you give it a spin. Use [ows]. Use [RxJS]. Use [Svelte 3][svelte] or [CycleJS]. Use something else. It doesn’t really matter. My point is that RP makes developing UIs very enjoyable.

I think that streams are an incredibly well-designed API and are a Swiss army knife that every web developer should strive to be familiar with. They can be useful in a variety of situations, not only to process `fetch()` results. Here’s hoping that the few remaining gaps in streams support get fixed soon.

[rxjs]: https://rxjs-dev.firebaseapp.com/
[wiki rp]: https://en.wikipedia.org/wiki/Reactive_programming
[the gof book]: https://www.amazon.co.uk/Design-patterns-elements-reusable-object-oriented/dp/0201633612/
[rxjs observable]: https://rxjs-dev.firebaseapp.com/guide/observable
[observer pattern]: https://en.wikipedia.org/wiki/Observer_pattern
[tc39 observables]: https://github.com/tc39/proposal-observable
[whatwg streams]: https://jakearchibald.com/2016/streams-ftw/
[ows]: https://npm.im/observables-with-streams
[not_woods]: https://twitter.com/Not_Woods
[ows documentation]: https://observables-with-streams.surma.technology
[jsdelivr]: https://www.jsdelivr.com/
[dof tool]: https://dof-tool.surma.technology
[dof source]: https://github.com/surma/dof-tool
[mdn readablestream]: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
[mattiasbuelens]: https://twitter.com/MattiasBuelens
[web-streams-polyfill]: https://npm.im/web-streams-polyfill
[streams support]: https://caniuse.com/#feat=streams
[cyclejs]: https://cycle.js.org/
[svelte]: https://svelte.dev/
[svelte 3 reactivity]: https://svelte.dev/blog/svelte-3-rethinking-reactivity
[rich harris]: https://twitter.com/Rich_Harris
[observer pattern]: https://en.wikipedia.org/wiki/Observer_pattern
[jake archibald]: https://twitter.com/jaffathecake
[rollup]: https://rollupjs.org/
[top-level await]: https://v8.dev/features/top-level-await
