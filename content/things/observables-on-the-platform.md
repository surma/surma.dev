---json
{
"title": "Observables are already on the platform",
"date": "2020-01-03",
"socialmediaimage": "social.png",
"live": false
}

---

... I think. Streams certainly feel like they fill that gap quite nicely.

<!--more-->

> **Disclaimer:** I am not very experienced with reactive programming or with [RxJS] specifically. The library I am introducing in this blog post is not supposed to be a direct competitor to RxJS. I am also not wagging my finger at RxJS or trying to put them down in any way, shape or form. Quite the opposite: The RxJS peeps and their community deserve a lot of credit for making reactive programming more popular on the web and filling the gaps in the platform. If I get something wrong, forgive me and let me know! I am actually kinda worried that everyone already knows this and I am just late to the party.

If you don’t care about the how and why but just want to see a quick run-down on the differences between RxJS and WHATWG streams, scroll down to the “Comparison” section.

## What are Observables and Reactive Programming?

Reactive Programming (RP) as a paradigm has been around for a while and is enjoyed popularity in many different genres of programming. I know that Android folks, especially since Kotlin, have seen a rise in popularity around RP. I have also noticed some game engines experimenting with RP. The topic is well covered in many parts of the web, so I won’t write yet another introduction to RP. But to make sure we are on the same page:

According to [Wikipedia][wiki rp], “reactive programming is a declarative programming paradigm concerned with _data streams_ and the propagation of change.” An [observable][rxjs observable] is a data structure on which you can register “observers”, as defined in [the GoF book]. An observer is pretty much a callback in JavaScript land:

```js
myButton.addEventListener("click", myClickHandler);
```

In this example, `myClickHandler` would be the observer, while `myButton` is an observable. Kinda. The differences (as I perceive them), are subtle but important:

- An observable is a single stream of data. `myButton` here has multiple “streams”. One for clicks, one for moving the mouse, one for key presses etc.
- A stream implies an input and an output and an order. Event listener don’t have an output as the return value of an event listener is discarded.

RxJS implements an `Observable` type and also packs utility functions, for example to turn an object with an event listener into a proper observable:

```js
import { fromEvent } from "rxjs";

const observable = fromEvent(myButton, "click");
observable.subscribe(ev => {
  /* ... */
});
```

## Sugar for streams

Now looking at Wikipedia’s definition of RP as well as [the introduction that RxJS gives][rxjs observable], I felt like [WHATWG Streams] (or just “streams”) fit that description very well. I was convinced (and I still worry) that I must be missing something. Why is there a [TC39 proposal for observables][tc39 observables] when we have streams? Why is RxJS not built on top of streams?

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

Definitely more noisy. Too noisy.

### Observables _with_ streams

To reduce the noise, I decided to write a little proof-of-concept library that models observables _with_ streams to make differences more obvious. It’s called [`observables-with-streams`][ows] (or “ows”) and published as a package.

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

At least in terms of syntax, that is pretty comparable, wouldn’t you agree? And that's no coincidence. The RxJS folks spent a lot of time and energy building their APIs and battle-testing it. All I did is look at their documentation for inspiration.

### Operators

Operators take data from an observable and transform it somehow to create a new observable. This can be a basic transformation like a `map` or `filter` which you might know from Arrays. But can also be more complex time-based transforms like `debouce` or flattening higher-order observables (an observable of observables) into a first-order observable with `concatAll`.

All of these operators are already well-defind and document by RxJS and as a result, ows contains many of the operators RxJS containsc. However, ows does not contain an implementation of `Observable`, as the whole premise is that observables are already on the platform through [`ReadableStream`][mdn readablestream].

```js
import { fromEvent } from "rxjs";
import { debounceTime } from "rxjs/operators";

fromEvent(myButton, "click")
  .pipe(debounceTime(100))
  .subscribe(ev => {
    /* ... */
  });
```

Or with ows:

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

So where do behave observables differently to streams? It seems to me that **the biggest difference between observables and streams is that observables create a new data source for every subscription, while a stream has one data source and one sink that get created immediately.** Let’s visualize that with a code example:

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
    next(1);
    next(EOF);
  }, 1000);
});

setTimeout(() => {
  owsObservable.pipeTo(
    subscribe(v => console.log(v))),
  );
}, 2000);
```

This code written with ows will exhibit the following behavior:

- Nothing for **2 seconds**
- Logs `"hello world"`

The ows example waits one second less until it starts logging. The difference stems from the fact that when using RxJS the code that generates the data (the callback passed to `new Observable()`) will only get executed once a subscriber appears. Streams work with data sources that get evaluated independently of data sinks, hence why the data is already queued up by the time the `subscribe()` call is executed.

### Single subscribers & backpressure

Streams were designed to model network traffic (amongst other things). You h

The reason is that streams work with data source independently of data sinks. They don’t wait for somebody to listen (a subscriber) to send data down the stream. Considering that WHATWG streams are used to model network transmission, that makes a lot of sense. Also, data that goes from a sink into a stream can only go to exactly one sink.

The callback that is passed to `new Observable()` will be executed for every time `subscribe()` is called on the observable. Once the callback of timeout #2 fires, the callback given to the `Observable` constructor will be executed. As a result, it will will see any data coming in for another second, after which timeout #1 will fire. Then the subscription callback will receive `"hello world"` and then the observable will end. To phrase it another way: Every subscriber gets its own data source.

With streams (and by extension ows), the same example behaves slightly different:

### Using observables with streams

The library is written in TypeScript, but also published as transpiled JavaScript to npm. The library is highly tree-shakable, so it should be used with a bundler to only keep the functions that you actually use. However, for playing around, you can also load it from a CDN like [JSDelivr] as one big bundle: `https://cdn.jsdelivr.net/npm/observables-with-streams@latest/dist/really-big-bundle.js`.

Here’s an example from the [documentation][ows documentation]:

```html
<!DOCTYPE html>

<button id="dec">-</button>
<span id="counter">0</span>
<button id="inc">+</button>

<script type="module">
  import * as ows from "observables-with-streams";

  ows
    .merge(
      ows
        .fromEvent(document.querySelector("#dec"), "click")
        .pipeThrough(ows.map(() => -1)),
      ows
        .fromEvent(document.querySelector("#inc"), "click")
        .pipeThrough(ows.map(() => 1))
    )
    .pipeThrough(ows.scan((v0, v1) => v0 + v1, 0))
    .pipeTo(
      ows.discard(v => (document.querySelector("#counter").textContent = v))
    );
</script>
```

(Massive thanks to [Tiger Oakes (@not_woods)][not_woods] for writing a good chunk of the documentation!)

The RxJS version is extremely similar:

```js
import { fromEvent, merge } from "rxjs";
import { map, scan } from "rxjs/operators";

merge(
  fromEvent(document.querySelector("#dec"), "click").pipe(map(() => -1)),
  fromEvent(document.querySelector("#inc"), "click").pipe(map(() => 1))
)
  .pipe(scan((v0, v1) => v0 + v1, 0))
  .subscribe(v => (document.querySelector("#counter").textContent = v));
```

## A full app

As an experiment, I tried to write a small web app using my library. Luckily, I had an itch that I needed to scratch: When you take a picture with your camera, the camera needs to focus on the subject. The “focus point”, the point that the camera is focusing on, is often shown on the screen of your camera. But not only that point is in focus, subjects closer to the camera (and subjects further away) can also be in focus. The region that you move a subject around in and still remain “in focus” is called “Depth of Field”, or DoF for short. It’s size depends on a couple of things: Focal length of the lens, aperture, subject distance and sensor size for starters. There a number of apps out there that calculate your DoF for you, but some have a disappointing UX or only expose a subset of the data I am interested in.

That tool is [DoF Tool]. Another tool with an uninspiring name. DoF Tool is [open source][dof source] and makes use of [observables-with-streams] for all of the UI and user interactions.

## Comparison

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
