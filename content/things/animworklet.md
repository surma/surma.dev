{
  "title": "Compositor Worklet evolves into Animation Worklet!",
  "date": "2016-09-26",
  "socialmediaimage": "animworklet.png"
}

Did you see that Pokémon Go reference? Gotta get down with the kidz.

<!--more-->

## What happened?

If you have seen [my talk at Google I/O about Houdini][IO Houdini], you’ll know that I am really excited about Compositor Worklet. And as I’ve said pretty much every time I talked about Houdini, all of it could change. At any time. And that’s exactly what happened to Compositor Worklet: Change!

To reiterate: Compositor Worklet allows developers to write code that runs on the compositor thread. This would guarantee that code gets run _every_ frame and would open a up new possibilities like imperatively implementing animations that are tied to other things than time such as inputs or scroll positions. The motivation is to expose a primitive on the web platform that can be used to implement these effects that currently aren’t possible or are only possible at the cost of fidelity and efficiency. Think snappy scrolling, writing your own pull-to-refresh or custom animation timing functions (like [Apple’s new `spring()`][Apple spring]). Another example is a scroll-linked effect like this avatar; inspired by the Twitter app:

<iframe width="100%" height="315" src="https://www.youtube.com/embed/EUlIxr8mk7s" frameborder="0" allowfullscreen></iframe>

### Journey

The original design of Compositor Worklet is more of a placeholder to get a discussion started in the Houdini task force. Compositor Worklet never had an official spec but just a back-of-napkin API. This allowed everyone in the task force to talk about it without setting anything in stone. These discussions revealed some concerns the browser vendors had, among other things: running user code sychronously on the “compositor” thread. Subsequently, the task force gave Compositor Worklet a massive face-lift and presented a new API at TPAC 2016. With that new API, code doesn’t run on the compositor thread anymore and to make that obvious, the API got a new name: *Animation Worklet*.

Generally speaking, the Houdini task force liked the new API and decided to move the proposal to the [WICG]. To move a proposal to the WICG it is required that at least 1 other brower vendor expresses interest in the API. In this particular case, all of [Apple, Google, Microsoft _and_ Mozilla expressed their interest][WICG interest comment].

### WICG

The WICG is the “Web Incubator Community Group”, where _everyone_ can participate in the discussion and design of a new API. The WICG’s purpose is to allow web developers to participate in the design of APIs to make sure they are both solving real-world problems and are useable by web developers. Web developers are even allowed and encouraged propose APIs of their own. However, the purpose of the WICG is also to allow proposals to die gracefully. That means Animation Worklet is not out of the woods yet. It might change or it might not happen at all. But I am fairly optimistic that _some_ form of Animation Worklet will become a standard.

## What’s changed?

The biggest change is that user code is not running on the compositor thread anymore. If the compositor thread gets blocked by code – may that be because it does too much or is just inefficient – the entire site would become unresponsive and animations would freeze. This was one of the biggest concerns expressed by browser vendors. With Animation Worklet (AW), code does not run _on_ the compositor thread, but rather runs in-sync _with_ it on a “best effort” basis. That means: If you do _stupid stuff™_ in your worklet, the animation is allowed to “slip”.

Apart from that, CW and AW are pretty much identical. In Chrome, we will actually implement AW using our existing implementation of CW. The syntax has been cleaned up a bit, though: Passing proxy objects per `postMessage` has been removed in favor of a declarative approach and we are now using ES2015 classes.

With this design, AW will yield _at least_ as good a performance as an implementation using `requestAnimationFrame`. AW is resilient to main thread jank as its code runs in a different thread. If your AW code is fast, the animation will be updated every frame. If your codes takes too long, you slip and the browser will end up running your code whenever it has time to spare – similar to what `rAF` would do.

## Code

Let’s look at some code. The example shown here links up two scrolling elements to synchronize their scroll position. With this it achieves something like Sublime’s code minimap. You can see the live demo (using the polyfill) [here][scroller demo].

<iframe width="100%" height="315" src="https://www.youtube.com/embed/knSDIkAdU3Y" frameborder="0" allowfullscreen></iframe>

### Animators

{{< highlight JS >}}
registerAnimator('sync-scroller', class SyncScrollerAnimator {
  static get inputProperties = ['--scroller-type'];
  static get inputScroll = true;
  static get outputScroll = true;

  animate(root, children) {
    var input =
      children.filter(e => e.styleMap.get("--scroller-type") == "input")[0];
    var outputs =
      children.filter(e => e.styleMap.get("--scroller-type") == "output");

    if (!input)
      return;

    outputs.forEach(elem => {
      elem.scrollOffsets.top = input.scrollOffsets.top;
      elem.scrollOffsets.left = input.scrollOffsets.left;
    });
  }
});
{{< /highlight >}}

Animators are classes that are run in the worklet and get to control certain attributes of DOM elements. Input properties are properties the animator needs to read to compute the animation. Output properties are properties that the animator might mutate. Both sets of properties have to be declared ahead of time. This will allow browsers to skip running an animatior if none of the input attributes changed since last frame.

For v1 of the Animation Worklet spec, the set of mutable attributes is limited to “fast” attributes like `opacity`, `transform` and scroll offsets. Scrolling has a special role which is why they get their own attributes called `inputScroll` and `outputScroll`.

{{< highlight HTML >}}
<style>
  .scroller {
    overflow-y: scroll;
  }

  #main_scroller {
    animator: sync-scroller;
    --scroller-type: input;
  }

  #alt_scroller {
    animator: sync-scroller;
    --scroller-type: output;
  }
</style>

<div id="main_scroller" class="scroller">
  <div>main content.</div>
</div>
<div id="alt_scroller" class="scroller">
  <div>some other content that scroll in sync.</div>
</div>
{{< /highlight >}}

Using the CSS `animator` directive, we can link up elements to an animator instance.

## Polyfill

My colleague Robert Flack wrote a polyfill for Animation Worklet and ported all the old Compositor Worklet demos to use the new Animation Worklet API. With the polyfill you can play with the API right now in any modern browser. With Chrome Canary, the polyfill even uses the old Compositor Worklet implementation under the hood so you get all the performance benefits and jank resilience. The polyfill is in my [Houdini Samples GitHub repository].

## What’s next?

For now, Animation Worklet is officially in the WICG and people can add their feedback to the [thread][WICG thread]. If you want more details on AW than what I jotted down here, I recommend reading the [explainer] written by my colleagues Majid Valipour and Rick Byers.

The time it takes to finish incubation is not fixed and varies from proposal to proposal. Once everybody involved feels the API is mature, well-defined and covers all the use-cases in an idiomatic way, the Houdini task force will strive to turn the spec into a Candidate Recommendation. If you want to keep up-to-date with developments, [follow me on Twitter][twitter] and/or sbuscribe to the [WICG thread].

[IO Houdini]: https://www.youtube.com/watch?v=sE3ttkP15f8
[WICG]: https://wicg.io/
[WICG interest comment]: https://discourse.wicg.io/t/proposal-animationworklet-a-primitive-for-scroll-linked-and-high-performance-procedural-animated-effects/1710/2
[scroller demo]: http://googlechrome.github.io/houdini-samples/animation-worklet/sync-scroller/
[Houdini Samples GitHub repository]: https://github.com/googlechrome/houdini-samples/
[WICG thread]: https://discourse.wicg.io/t/proposal-animationworklet-a-primitive-for-scroll-linked-and-high-performance-procedural-animated-effects/1710
[explainer]: https://github.com/majido/animation-worklet-proposal/blob/gh-pages/README.md
[twitter]: https://twitter.com/DasSurma
[Apple spring]: https://webkit.org/demos/spring/
