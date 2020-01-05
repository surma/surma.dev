---json
{
"title": "Observables on the platform",
"date": "2020-01-03",
"socialmediaimage": "social.png",
"live": false
}

---

They are already there. I think. Streams certainly feel like they fill that gap quite nicely.

<!--more-->

> **Disclaimer:** I am not experienced with reactive programming or with [RxJS] specifically. The library I am introducing in this blog post is not supposed to be a competitor to RxJS. The RxJS peeps and their community deserve all the credit for making reactive programming more popular on the web and filling the gaps on the platform. I just copied what they distilled over many years in my library. If I got something wrong, please forgive me and let me know! I am actually kinda worried that everyone already knows this and I am just late to the party.

## What are Observables and Reactive Programming?

Reactive Programming (RP) as a paradigm is not new and has enjoyed popularity in many different genres of programming. For example Android folks, especially since Kotlin, have seen a rise in popularity around RP. I have also noticed some game engines experimenting with RP. The topic is well covered in many parts of the web, so I won’t write yet another introduction to RP. But to make sure we are on the same page:

According to [Wikipedia][wiki rp], “reactive programming is a declarative programming paradigm concerned with _data streams_ and the propagation of change.” An [“observable”][rxjs observable] is a type on which you can register “observers”, as defined in [the GoF book]. For the time being, you can think of an observer as callback in JavaScript land:

```js
myButton.addEventListener("click", myClickHandler);
```

In this example, `myClickHandler` would be the observer, while `myButton` is an observable. Kinda. The differences (as I perceive them), are subtle but important:

- An observable is a single stream of data. `myButton` here has multiple “streams”. One for clicks, one for moving the mouse, one for key presses etc.
- A stream implies an input and an output and an order. Event listener don’t have an output as the return value of an event listener is discarded.

RxJS implements an `Observable` type and also ships many utility functions, for example to turn event source into an observable:

```js
import { fromEvent } from "rxjs";

const observable = fromEvent(myButton, "click");
observable.subscribe(ev => {
  /* ... */
});
```

## Sugar for streams

Now looking at Wikipedia’s definition of RP as well as [the introduction that RxJS gives][rxjs observable], I felt like [WHATWG Streams] (or just “streams”) fit in the same gap as observables. So why are they so rarely mention together? I was convinced (and I still worry) that I must be missing something. Why is there a [TC39 proposal for observables][tc39 observables] when we have streams? Why is RxJS not built on top of streams?

The first thing that stands out that is that the API of streams is less convenient (but arguably more flexible and powerful) than observables. For example, the click event stream from the example above would look like this when written with vanilla streams:

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

Definitely too noisy.

### Observables _with_ streams

To reduce the noise, I decided to write a little proof-of-concept library that models observables _with_ streams. I was hoping this would allow me to explore the differences between RxJS’ take on observables and mine. It’s called [`observables-with-streams`][ows] (or “ows”) and published as a package npm.

With this library in place, the example above can be simplified:

```js
import { fromEvent, subscribe } from "observables-with-streams";

const owsObservable = fromEvent(myButton, "click");
ows.pipeTo(
  subscribe(v => {
    /* ... */
  })
);
```

At least in terms of syntax, that is pretty comparable, wouldn’t you agree? And that's no coincidence, as I used RxJS’ documentation as my reference guide. The RxJS folks spent a lot of time and energy to battle-test and refine their APIs. It seemed like a good idea to not come up with my own behaviors and corner-cases, but rather use what has already been tried and tested. I read their documentation to understand the behavior and reimplemented some of their operators using streams.

You can get a feel for the current extent of ows through its [documentation][ows documentation]. At this point also a massive “thank you” to [Tiger Oakes (@not_woods)][not_woods] who wrote a good chunk of the documentation!

### Operators

Just having a different syntax to subscribe to events is not really that interesting. What makes RP really powerful is the ability to encapsulate individual steps of data processing into functions and to connect multiple observables into a network of data streams. The core concept to achieve this are “operators”.

Operators take an observable and return a new observable, giving the operator a chance to mangle or transform the data from the original observable. This can be a basic transformation like a `map` or `filter` which you might know from Arrays. But can also be more complex time-based transforms like `debouce`, flattening higher-order observables (an observable of observables) into a first-order observable with `concatAll` or combining multiple observables into one with `combineLatestWith`.

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

These examples above look like equivalent code. But do they actually behave the same? Or is there a difference between observables and streams? Here is one example where two seemingly equivalent programs behave differently:

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

So the ows example waits one second _less_ until it logs something. This difference stems from the fact how these two systems handle their data sources: **RxJS runs the code that generates the data (the callback passed to `new Observable()`) once a subscriber appears. Streams on the other hand run that code immediately, independently of data sinks. The data is already buffered up by the time the `subscribe()` call is executed.**

### Single subscribers vs. multiple subscribers

The difference above implies a second, arguably more important difference. Let’s look at another comparison:

```js
import { from } from "rxjs";

const rxObservable = from([1, 2, 3]);
rxObservable.subscribe(v => console.log(`Subscriber 1: ${v}`));
rxObservable.subscribe(v => console.log(`Subscriber 2: ${v}`));
```

Same behavior with ows:

```js
import { fromIterable, subscribe } from "observables-with-streams";

const owsObservable = fromIterable([1, 2, 3]);
const [o1, o2] = owsObservable.tee(); // !!!
o1.pipeTo(subscribe(v => console.log(`Subscriber 1: ${v}`)));
o2.pipeTo(subscribe(v => console.log(`Subscriber 2: ${v}`)));
```

Observables will create a new data source for every subscriber. Streams _wrap_ a data source rather than creating it. If no sink is present, it gets buffered up. However, once an item has moved forward in the stream, late subscribers will not get to see that item.

If you want for two subscribers to process the same items, you have to explicitly make a copy, for example by using `tee()`. This will consume the original stream and return two new ones that will output the same data as the original stream.

This design choice makes a lot of sense considering what WHATWG streams were designed around: network traffic. WHATWG Streams are used for `fetch()` to handle both the request body as well as the response body (so upload and download). In these scenarios, data that has been sent is sent. These bodies can be quite large so no system should keep a copy of the data around by default, unless explicitly instructed to do so.

## ows for app development

Now that I had established where streams (and by extension ows) work differently than RxJS, I was wondering if these differences make ows impractical for writing web apps. Time to write a little example app. Luckily, I had an itch that I needed to scratch: When you take a picture with your camera, the camera needs to focus on the subject. The “focus point”, the point that the camera is focusing on, is often shown on the screen of your camera. But not only that point is in focus, subjects closer to the camera (and subjects further away) can also be in focus. The region that subjects can move around in and still remain “in focus” is called “Depth of Field”, or DoF for short. Its size depends on a couple of things: Focal length and aperture of the lens, subject distance and sensor size to start with. There a number of apps out there that calculate your DoF for you based on these variables, but some have a disappointing UX or only expose a subset of the data I am interested in.

So I wrote my own. And that tool is [DoF Tool]. Another uninspiring name. DoF Tool is [open source][dof source] and makes use of [observables-with-streams][ows] for all of the UI and user interactions. ows is written in TypeScript, but also published as transpiled JavaScript to npm. The library is highly tree-shakable, so it should be used with a bundler to only keep the functions that you actually use. However, for playing around, you can also load it from a CDN like [JSDelivr] as one big bundle: `https://cdn.jsdelivr.net/npm/observables-with-streams@latest/dist/really-big-bundle.js`.

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
  .pipeThrough(ows.debounce(1000))
  .pipeThrough(ows.forEach(storeInIDB))
  .pipeTo(ows.discard());
```

One thing I noticed while writing DoF Tool: I didn’t encounter the “late subscribers” problem from above at all. I declared my chain of operators, which set up the data flow of the app and remained static throughout the app’s lifetime. _If_ I needed to accommodate late subscribers, I would have had `tee()` at my disposal.

### Performance

I did not do any benchmarks. The app performs well on a wide spectrum of devices, and that’s all that matters to me in the end. I was also more interested in comparing capabilities and developer experience first before jumping straight into a performance rabbit hole.

### Library size & cross-browser support

Because ows uses `ReadableStream` as its basic type for observables, and `ReadableStream` is available in all major browsers, it doesn't have to ship an implementation of the basic type itself. As such the entire ows library (the `really-big-bundle.js` version) currently weighs in at 2KiB after gzip.

However, operators are implemented as `TransformStreams` and sinks as `WritableStreams`, [the support for which is more lacking][streams support]. At the time of writing, only Blink-based browsers have full support for streams. Firefox supports neither `WritableStreams`, `TransformStream` nor the `pipeTo()` or `pipeThrough()` methods. Safari is also lacking support for `WritableStream`.

To run ows in these browsers, you’d need to load a polyfill, like [Mattias Buelens’][mattiasbuelens] [`web-streams-polyfill`][web-streams-polyfill], which adds a whopping 20KiB after gzip. That’s a lot, but a payload that will automatically go away when browsers catch up.

> **Note:** Again, I am not aiming for ows to compete RxJS. Rather, I wanted to show off streams and potentially start a discussion if RxJS could be re-built on top of WHATWG streams. I think it can be done and could save quite a bit of code if they did, provided support increases.

### Loading the polyfill

_If_ you wanted to use ows, make sure to only load the polyfill if the browser requires it. In DoF Tool, I am loading the polyfill if any of the 3 basic stream types are missing.

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

## Conclusion

Getting my feet wet with reactive programming was really fun. If you haven’t tried it, I’d recommend you give it a spin. Use [ows]. Use [RxJS]. Use something else. It doesn’t really matter. The point is that RP patterns seem to make a lot of sense when developing UIs.

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
[rxjs sample]: https://rxjs-playground.github.io/#/?html=%3Cbutton%20id%3D%22dec%22%3E-%3C%2Fbutton%3E%0A%3Cspan%20id%3D%22counter%22%3E0%3C%2Fspan%3E%0A%3Cbutton%20id%3D%22inc%22%3E%2B%3C%2Fbutton%3E&js=Rx.Observable.merge%28%0A%20%20Rx.Observable.fromEvent%28document.querySelector%28%22%23dec%22%29%2C%20%22click%22%29%0A%20%20%20%20.map%28%28%29%20%3D%3E%20-1%29%2C%0A%20%20Rx.Observable.fromEvent%28document.querySelector%28%22%23inc%22%29%2C%20%22click%22%29%0A%20%20%20%20%20.map%28%28%29%20%3D%3E%201%29%0A%29%0A%20%20.scan%28%28v0%2C%20v1%29%20%3D%3E%20v0%20%2B%20v1%2C%200%29%0A%20%20.subscribe%28v%20%3D%3E%20document.querySelector%28%22%23counter%22%29.textContent%20%3D%20v%29%0A
[dof tool]: https://dof-tool.surma.technology
[dof source]: https://github.com/surma/dof-tool
[mdn readablestream]: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
[mattiasbuelens]: https://twitter.com/MattiasBuelens
[web-streams-polyfill]: https://npm.im/web-streams-polyfill
[streams support]: https://caniuse.com/#feat=streams
