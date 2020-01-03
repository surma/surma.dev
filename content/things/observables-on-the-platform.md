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

const observable = fromEvent("myButton", "click");
observable.subscribe(ev => {
  /* ... */
});
```

## Observables with streams

Now looking at Wikipedia’s definition of RP as well [the introduction that RxJS gives][rxjs observable], I felt like [WHATWG Streams] fit that description very well. I was convinced (and I still have that worry) that I must be missing something, because I know that there has been a [TC39 proposal for observables][tc39 observables] out for a while. It’s quieted down a bit in the last couple of months, but a lot of work has been put into it. So why is this proposal there, when streams are already on the platform? I decided to write a little proof-of-concept library that models observables with streams to see if that would help me realize the difference. And so I wrote the [`observables-with-streams`][ows] (or “ows”) package. Not the most inspiring name, I know.

The thing to note about ows is that it’s merely a collection of operators like `map`, `filter`, `zip`, `merge`, etc. ows does not contain an implementation of `Observable`, as the whole premise is that observables are already on the platform through [`ReadableStream`][mdn readablestream].

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

And that's no coincidence. The RxJS spent a lot of time and energy building their APIs and battle-tested them. All I had to do is look at their operators and pick my favorites. I implemented a bunch of them for ows. You can find them in the [documentation][ows documentation].

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
