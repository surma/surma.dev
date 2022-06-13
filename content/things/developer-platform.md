---
title: "Build layers, not frameworks."
date: "2022-06-09"
live: false
socialmediaimage: "social.jpg"
---

Being a developer building for developers requires an interesting variant of self-descipline: It can be tempting to build a well-designed and convenient abstraction for developers, that takes care of a lot of repetitive work. However, this is only valuable if you understand the work the abstraction is doing for you. Otherwise it’s just magic.

<!-- more -->

For the longest time, I worked as a Developer Advocate for the Open Web Platform, exploring when building apps on the web platform rather than directly on any mobile platform is advantageous, and what these advantages are. It’s certainly a challenging pitch at times

I now work at Shopify, focusing on their Developer Experience (DX). Shopify provides a platform for developers to build custom stores or write new functionality for other people’s stores through apps. The platform Shopify provides is built on top of the web. (They also provide integrations in other platform. Wherever merchants need to be, Shopify wants to be there, too, to support them.) I started by trying as many of the things Shopify offers as I could. Many are great, some other made me go “this feels wrong”. I tried to extract what the distinguishing factor between these two experiences was, and the result is this blog post.

<figure>
<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I noticed that I get extra frustrated, sometimes almost angry when a tech product (especially software) breaks in a way that I can’t fix. Maybe I’m too used to being able to hack the source code of my npm deps.</p>&mdash; Evan You (@youyuxi) <a href="https://twitter.com/youyuxi/status/1535987671868137472?ref_src=twsrc%5Etfw">June 12, 2022</a></blockquote>
<figcaption>Evan You talking is frustrated about his tools being taken away.</figcaption>
</figure>

## The Web Platform

The Web Platform is a beautiful mess. The Web Platform has been expanded and evolved by hundreds (thousands?) of people over the last couple of decades. It evolved from a document platform to an extremely capable app platform, and the pace at which it is evolving has increased as well. This certainly hasn’t happened without leaving stretchmarks. The APIs on the web at sometimes decades, sometimes mere months old. What is considered common API design has also evolved. For example, older APIs couldn’t make use of JavaScript async/await, which only landed in JavaScript in the late 2010s. And lest we forget, the Web Platform is owned by everyone and no one in particular, which means progress and consensus is a lot harder to come by than, say, Android or iOS. It has multiple, independent, often slightly incompatible implementations. This has obvious bad consequences, but also many good ones which, admittedly, more subtle and not always very immediate.

Overall the Web Platform has become so massive that it’s been generally agreed that no single person will be able to implement a browser by themselves anymore. Grid layout, ServiceWorker, WebUSB... all of these are big efforts individually, let alone implementing all of them.

A lot of the Web Platform has been designed along the [Extensible Web Manifesto], which focused on baking _low-level_ primitives into the platform, letting the ecosystem build higher level primitives ontop and only baking those high-level primitives into the platform once they had been tried, tested and deemed successful. This long-lasting growth of The Web Platform, and a commitment to (almost) never ship breaking changes, made the web also notoriously uneven (or “lumpy”, as [Paul Kinlan] [blogged][lumpy web]). The levels of abstractions the Web APIs provide have an extremely high variance. On the one end of the spectrum there’s something like [WebAssembly], a low-level VM that doesn’t provide any convenience but can do pretty much anything. On the other end of the spectrum is [CSS], a declarative styling language that makes complex layouts and animations easy on any device, but lets you only do what it has declarative syntax for.

<figure>
	<picture>
		<img src="./platform.png" alt="A platform with multiple blocks of different sizes and height. Each block represents a Web Platform API, while the block’s height represents the level of abstraction that API has.">
	</picture>
	<figcaption>The Web Platform is vast. It exposes many API surfaces of different sizes and with different levels of abstraction.</figcaption>
</figure>

Most of us web developers have not the mastered, or even gotten in contact with every single API the Web Platform has to offer. And that’s okay! It’s just _too big_ for any individual to master in its entirety.

## The Developer

No matter in which context you are reading this, there is a universal truth: Developers want do build _something_. And usually, they want to focus on getting it done fast. The uneven shape of the Web Platform can stand in the way of that. The first step to improving the situation is to ignore the APIs that are not required to reach the goal. Focusing on only a subset of the platform will likely reduce the variance, but rarely does it leave you with a smooth API surface to work on top of.

<figure>
	<picture>
		<img src="./subplatform.png" alt="A considerably smaller platform with 4 blocks of different heights. The DOM, CSS, Web Components and ???">
	</picture>
	<figcaption>Usually, only a small set of APIs is relevant for any given use-case. This will reduce — but not remove — the inconsistency of abstraction levels.</figcaption>
</figure>

The next step to make developers’ lives easier can come in many shapes, all with their own pros and cons.

## Libraries & frameworks

The distinction between “library” and “framework” has always been a matter of debate. I will not pretend that I can settle that debate, but for the context of this blog post, I’ll use the following mental model.

### Libraries

All the code we write either integrates into the platform or connects blocks to make them work together. Integration code needs to have a certain shape to slot into the platform and work correctly. Libraries are bundles of reusable functionality that we can call into from our code. If a library isn’t needed anymore or a better library comes along, it only affects the parts where the library is used.

### Frameworks

I distinguish between a library and a framework by look at _Inversion of Control_. When you use a library, you slot it into your code and call into the library at the appropriate places. A framework, on the other hand, makes itself the heart of the problem domain and offers slots for you to put code into. It’s the Hollywood principle: You don’t call the framework, the framewark _calls you_.

This inversion of control and the framework being the center of the universe is not inherently bad. After all, the framework was designed to be in this place and probably provides some pretty sophisticated machinery for the use-case.

The upside of frameworks is that they usually provide elegantly designed and modern APIs. The expose a clean interface.

<figure>
	<picture>
		<img src="./framework.png" alt="The platform from the previous image is now covered by a new platform-like layer with indents of different shapes.">
	</picture>
	<figcaption>Frameworks (at least partially) abstract the underlying platform and call your code in the right mooments.</figcaption>
</figure>

The problems start when you need to do something that the framework didn’t antipicate.

## Escape hatches

When the abstractions provided by a library or framework prove to be insufficient or overbearing, it is often necessary to _pierce_ the abstraction and drill back through to the underlying platform. If a framework has built-in ways for the developer to pierce it, it’s often called an “escape hatch”. For example, React provides the [`ref` property][ref] do get access an components underlying DOM element, giving you access to the Web Platform primitive.

Escape hatches are, in my opinion, an absolute necessity in any library or framework. It is hard for any author to anticipate every possible use-case, and providing escape hatches allows developers to work around a restriction and keep moving rather than getting stuck. Whether or not a code change that breaks escape hatch users is a breaking change, is an interesting discussion that I will avoid here.

<figure>
	<picture>
		<img src="./escapehatch.png" alt="A considerably smaller platform with 4 blocks of different heights. The DOM, CSS, Web Components and ???">
	</picture>
	<figcaption>While escape hatches are critical, they often put a burden on the developer having to now manually gap the bridge between platform and framework.</figcaption>
</figure>

The downside of escape hatches, especially in frameworks, is that you often drop _all_ the way down to the platform. Often that is fine. At other times, it can pose a challenge for the developer, as they now have to do the work that the framework did for them previously: Bridging the gap between platform and framework. The higher-level the abstraction you are working with, the more work that entails. For example, using `<canvas>` efficiently from within a React component can be somewhat challenging (especially in the era of hooks, in my opinion). Another example would be to pierce [ThreeJS]’s abstractions and writing low-level WebGL that integrates nicely with the rest of ThreeJS management code. This requires extensive knowledge of how ThreeJS works and its internals.

In the end, using escape hatches are both necessary to not restrict developers, but can also be quite costly for developers to use. I think there is a middle ground.

## Layers

Many abstractions aim to sit on top of all primitives of the underlying platform. Sometimes this is done so that the underlying platform can be switched out for another without requiring code changes (see React Native), sometimes it is done so that the abstraction can be in control of how and when the underlying platform is actually utilized. The tradeoff here, even with escape hatches, is that the developer is left with a binary choice: Either work on top of the abstraction, or throw away _all_ utility provided by the abstraction and go back to the platform.

What if instead of building one abstraction that hides everything, we build multiple abstractions, where each abstraction sits atop the previous one. Like a ladder. Each layer adds utility and convenience. Inevitably, by the nature of tradeoffs, it also adds opinions and constraints. Depending on what the developers knows and needs, they can choose which layer they feel at home one. They can even climb up or drop down a layer (or two, or three...) on a case-by-case basis. This means that the lower layers won’t necessarily be able to abstract away the playform. In fact, they shouldn’t. Instead they should embrace the primitives provided by the platform and follow their patterns, as developers already know them.

<figure>
	<picture>
		<img src="./layers.png" alt="A considerably smaller platform with 4 blocks of different heights. The DOM, CSS, Web Components and ???">
	</picture>
	<figcaption>While escape hatches are critical, they often put a burden on the developer having to now manually gap the bridge between platform and framework.</figcaption>
</figure>

Design systems for the web are one example that I think could greatly benefit from a layered approach.At the bottom layer, we’d


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




[lumpy web]: https://paul.kinlan.me/the-lumpy-web/
[Paul Kinlan]: https://twitter.com/paul_kinlan
[webassembly]: https://webassembly.org/
[css]: https://developer.mozilla.org/en-US/docs/Web/CSS
[extensible web manifesto]: https://extensiblewebmanifesto.org/
[ref]: https://reactjs.org/docs/refs-and-the-dom.html
[Threejs]: https://threejs.org/
[primer]: https://primer.style/

<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>