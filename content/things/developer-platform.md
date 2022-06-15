---
title: "Build layers, not frameworks."
date: "2022-06-09"
live: false
socialmediaimage: "framework.png"
---

Being a developer building for developers requires discipline: It is tempting to build abstractions so developers have to do less and get to build stuff faster. However, this can easily end up having the opposite effect.

<!-- more -->

For the longest time, I worked as a Developer Advocate for the Open Web Platform, exploring when building apps on the web platform rather than directly on any mobile platform is advantageous, and what these advantages are. It’s certainly a challenging pitch at times.

I now work at Shopify, focusing on their Developer Experience (DX). Shopify is a platform itself provides a plethora of tools and libraries for for developers. Many of them are great. Some others made me go “this feels wrong” when I tried them. I tried to figure out what aspect would make me react one way versus the other. The result is this blog post.
## The Web Platform

The Web Platform is a beautiful mess. The Web Platform has been expanded and evolved by hundreds (thousands?) of people over the last couple of decades. It evolved from a document platform to an extremely capable app platform, and the pace at which it is evolving has increased as well. This certainly hasn’t happened without leaving stretchmarks. Some APIs on the Web Platform are decades old, while others barely have a couple of months under their belt. Every API can only make us of what the web had to offer at the time of inception. Many old APIs would benefit from JavaScript’s `async`/`await`, but that only landed in JavaScript in the late 2010s. And lest we forget, the Web Platform is owned by everyone and no one in particular, which means progress and consensus is a lot harder to come by than, say, Android or iOS. It has multiple, independent, often slightly diverging implementations. This has obvious bad consequences, but also many good ones which are, admittedly, more subtle and not always very immediate.

A lot of the Web Platform has been designed with the [Extensible Web Manifesto] in mind, which incentivizes  _low-level_ primitives and putting the burden of building higher level primitives on the ecosystem. High-level APIs are only getting considered once they have been tried, tested and deemed successful. This, together with the long-lasting growth of The Web Platform, and a commitment to (almost) never shipping breaking changes, made the web also notoriously uneven (or “lumpy”, as [Paul Kinlan] [blogged][lumpy web]). The levels of abstractions of Web APIs have an extremely high variance. On the one end of the spectrum there’s something like [WebAssembly], a low-level VM that doesn’t provide any convenience but can do pretty much anything. On the other end of the spectrum is [CSS], a declarative styling language that makes complex layouts and animations easy on any device, but lets you only do what it has declarative syntax for.

<figure>
	<picture>
		<img src="./platform.png" alt="A platform with multiple blocks of different sizes and height. Each block represents a Web Platform API, while the block’s height represents the level of abstraction that API has.">
	</picture>
	<figcaption>The Web Platform is vast. It exposes many API surfaces of different sizes and with different levels of abstraction.</figcaption>
</figure>

Web developers, in general, learn this The Web Platform, despite its flaws. They learn HTML, JavaScript, CSS. They learn about `npm`, about [Rollup], [Webpack], [vite] or any of the other build tools. They learn to embrace the arcane Web Platform APIs like `pushState` and love the more modern additions like CSS Grid or `async`/`await`. Gaps and shortcomings in the platform are often addressed through libraries or frameworks like jQuery, Lo-dash or even React, which for the rest of this blog post I will group under “abstractions”.

## Learning & fixing

No matter from whose perspective you are reading this, there is a universal truth: Developers want do build _something_. And usually, they want to get it done. Friction in the process of building things will likely manifest as frustration, and the more frustrated a developer gets, the more likely they are to abandon the effort. If you are working on a platform, it’s in your interest to prevent these frustrations.

After a bit of reflection, I concluded that there are two major causes for my frustrations when trying Shopify DX products:

1. I knew how to solve a problem with web technologies, but the abstraction prevented me from using my knowledge. Instead I had to **learn** something new.
2. I was prevented from fixing a shortcoming in the abstraction (short of creating a custom fork), because the abstraction was too watertight .

By complete coincidence, [Evan You] voiced a similar feeling that week:

<figure>
<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I noticed that I get extra frustrated, sometimes almost angry when a tech product (especially software) breaks in a way that I can’t fix. Maybe I’m too used to being able to hack the source code of my npm deps.</p>&mdash; Evan You (@youyuxi) <a href="https://twitter.com/youyuxi/status/1535987671868137472?ref_src=twsrc%5Etfw">June 12, 2022</a></blockquote>
<figcaption>Evan You talking is frustrated about his tools being taken away.</figcaption>
</figure>

This makes me arrive at a conclusion that might be very counter-intuitive: While the uneven shape of the Web Platform may seem like a major source of friction, it’s likely that the developer has already learned and mastered it. If you _force_ the developer to use your abstraction, it might not be a net-positive. If a developer already has the skill to solve a problem, but the abstraction doesn’t allow them to use that skill and rather forces them to spend time learning the idioms, quirks and bugs of something new, frustration happens.

This is especially important for framework-like abstractions.

## Libraries & frameworks

The distinction between “library” and “framework” has always been a matter of debate. I will not pretend that I can settle that debate, but for the context of this blog post, I’ll use the following mental model.

### Libraries

All the code we write either integrates into the platform or connects blocks to make them work together. Integration code needs to have a certain shape to slot into the platform and work correctly. Libraries are bundles of reusable functionality that we can call into from our code. If a library isn’t needed anymore or a better library comes along, it only affects the parts where the library is used.

### Frameworks

I distinguish between a library and a framework by looking at the _Inversion of Control_. When you use a library, you slot the library into your code and call into the library in the appropriate places. A framework, on the other hand, makes itself the center of the universe and offers slots _for you to slot into_. It’s the Hollywood principle: You don’t call the framework, the framewark calls you.

This inversion of control is not inherently bad. After all, the framework was designed to be in this place and probably provides some pretty sophisticated machinery to make your code run better, more efficiently or at the right time. Another upside of frameworks is that they usually provide elegantly designed and modern interfaces.

<figure>
	<picture>
		<img src="./framework.png" alt="The platform from the previous image is now covered by a new platform-like layer with indents of different shapes.">
	</picture>
	<figcaption>Frameworks (at least partially) abstract the underlying platform and call your code in the right mooments.</figcaption>
</figure>

The problems start when you need to do something that the framework didn’t antipicate.

## Escape hatches

When the abstractions provided by a library or framework prove to be insufficient or overbearing, it is often necessary to _pierce_ the abstraction and drill through to the underlying platform primitive. If an abstraction has built-in ways for the developer to pierce it, it’s often called an “escape hatch”. For example, React provides the [`ref` property][ref] do get access an components underlying DOM element, giving you access to the Web Platform primitive.

Escape hatches are, in my opinion, an absolute necessity in any library or framework. It is near impossible to anticipate every possible use-case, and providing escape hatches allows developers to work around a restriction and keep moving rather than getting stuck. (Whether or not a code change in the abstraction that breaks escape hatch users should be considered a breaking change, is an interesting discussion that I will not get into here.)

<figure>
	<picture>
		<img src="./escapehatch.png" alt="A considerably smaller platform with 4 blocks of different heights. The DOM, CSS, Web Components and ???">
	</picture>
	<figcaption>While escape hatches are critical, they often put a burden on the developer having to now manually gap the bridge between platform and framework.</figcaption>
</figure>

The downside of escape hatches, especially in frameworks, is that you often drop _all_ the way down to the platform. That can be fine. At other times, it can pose a challenge for the developer, as they now have to do the work that the framework did for them previously: Bridging the gap between platform and framework. The higher-level the abstraction you are working with is, the more work that entails.

For example, using `<canvas>` efficiently from within a React component can be somewhat challenging (especially in the era of hooks, in my opinion). Another example would be to pierce [ThreeJS]’s abstractions and writing low-level WebGL that integrates nicely with the rest of ThreeJS management code. This requires extensive knowledge of how ThreeJS works and its internals.

In the end, providing escape hatches is both necessary to not restrict developers, but is also not ideal as they can be quite costly for developers to use.

## Layers

Many abstractions aim to sit on top of all primitives of the underlying platform. Sometimes this is done so that the underlying platform can be switched out for another without requiring code changes (see React Native), sometimes it is done so that the abstraction can be in control of how and when the underlying platform is actually utilized. The tradeoff here, even with escape hatches, is that the developer is left with a binary choice: Either work on top of the abstraction, or throw away _all_ utility provided by the abstraction and go back to the platform.

I think the better approach is to build multiple abstractions that build on one another, like a ladder. Each layer adds utility and convenience. Inevitably, by the nature of tradeoffs, it also adds opinions and constraints. Depending on what the developers knows and needs in any given situation, they can choose which layer provides the appropriate level of convenience and abstraction. They can even climb up or drop down a layer (or two, or three...) on a case-by-case basis. This means that the lower layers won’t necessarily be able to abstract away the platform. In fact, they shouldn’t. Instead they should embrace the primitives provided by the platform and follow their patterns, as developers already know them.

<figure>
	<picture>
		<img src="./layers.png" alt="A considerably smaller platform with 4 blocks of different heights. The DOM, CSS, Web Components and ???">
	</picture>
	<figcaption>While escape hatches are critical, they often put a burden on the developer having to now manually gap the bridge between platform and framework.</figcaption>
</figure>

Another benefit of this approach is dog-fooding your own abstractions. If you are strict about any given layer only using the layer below (and platform primitives) to implement its functionality, you can be sure that it will be a useful escape _layer_ for developers. Whenever you need to cheat here and break that principle, it’s a sign that the underlying layer is either abstracting and hiding too much or doesn’t provide enough utility.

### Patterns

One thing that is important to keep in mind when designing the layers is to lean into existing patterns of the Web Platform. This is not a [`#useThePlatform`][polymer platform] revival, but rather motivated by my observations above: It is frustrating for developers to have a skill and not be allowed to use it. One of My favorite example here is that React components don’t have events and event bubbling, which is something that every developer learned to embrace (before React came along).

But don’t swing too far the other way: Providing convenience to developers is still extremely valuable! The important part is to not _force_ it onto them, just because they chose to use your abstraction. Whenever there is a platform-provided pattern or API, it’s usually a good idea to use it. If it proves insufficient for certain use-cases, provide an opt-in to a higher abstraction with escape hatches.

To me it seems that the perceived value of an abstraction rises when the developer truly understands how much heavy lifting is done for them.

Let me try and illustrate all of this with an example.

## Example

Design systems for the web are one example that I think could greatly benefit from a layered approach. Let’s take a look at [GitHub’s Primer][primer] design system.

Primer provides a pure CSS library


## Conclusion

- Height = level of abstraction (wasm = low, DOM = medium, CSS = high, WebRTC = a fractal)
- Define scope
- Created surface = new stuff to learn + code
- Created volume = potential sources of errors that the dev can’t fix
- New platform = new layer to work on, can switch out underlying tech
- Framework = inversion of control, you write blocks that slot into the framework
- library = you write code and libraries slot in

- Status quo: we are mostly in framework land. e.g almost everyone uses React
- Escape hatches = Little holes, usually under a cover that allow you to pierce the abstraction

- Is that the best we can do? Increasingly I think the answer is: No. We can do better.
- The goal is to make devs productive fast, so meet them where they are
- Similar level of abstraction
- Attach to existing API surface rather than abstract, devs already know that stuff!
- Hole-y platform: Enriches developers lives while minimizing surface area (= time spent learning)
- Layered platforms: By allowing developers to choose on which layer to write a block of code

## Scratchpad

I have been thinking a lot about how you support developers working on top of a platform. Where do you slot in between the developer and the underlying platform?

Here’s a visual metaphor of how I think about this.

Don’t force developers to do something your way when they already have a way of their own — even if your way is easier or more convenient. Let them opt-in rather than opt-out. Intuition matters.

 convenient and holistically designed abstraction for developers. While my motivation is to provide convenience and simplicity for the developer to increase their productivity, it can often cause the opposite. Abstractions are more valuable if the developer understands _what_ the abstraction is doing for them. Otherwise developers have to learn how to use the abstraction, and how it works will remain “magic”, which will likely end up being frustrating once they want go off the well-trodden path.


The . The first step to improving the situation is to ignore the APIs that are not required to reach the goal. Focusing on only a subset of the platform will likely reduce the variance, but rarely does it leave you with a smooth API surface to work on top of.

<figure>
	<picture>
		<img src="./subplatform.png" alt="A considerably smaller platform with 4 blocks of different heights. The DOM, CSS, Web Components and ???">
	</picture>
	<figcaption>Usually, only a small set of APIs is relevant for any given use-case. This will reduce — but not remove — the inconsistency of abstraction levels.</figcaption>
</figure>

The next step to make developers’ lives easier can come in many shapes, all with their own pros and cons.

Overall the Web Platform has become so massive that it’s been generally agreed that no single person will be able to implement a browser by themselves anymore. Grid layout, ServiceWorker, WebUSB... all of these are big efforts individually, let alone implementing all of them.

Most of us web developers have not the mastered, or even gotten in contact with every single API the Web Platform has to offer. And that’s okay! It’s just _too big_ for any individual to master in its entirety.
<script type="module" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

[lumpy web]: https://paul.kinlan.me/the-lumpy-web/
[Paul Kinlan]: https://twitter.com/paul_kinlan
[webassembly]: https://webassembly.org/
[css]: https://developer.mozilla.org/en-US/docs/Web/CSS
[extensible web manifesto]: https://extensiblewebmanifesto.org/
[ref]: https://reactjs.org/docs/refs-and-the-dom.html
[Threejs]: https://threejs.org/
[primer]: https://primer.style/
[evan you]: https://twitter.com/youyuxi
[rollup]: https://rollupjs.org/
[webpack]: https://webpack.js.org/
[vite]: https://vitejs.dev/
[polymer platform]: https://www.polymer-project.org/blog/2016-05-26-IO-2016-Recap