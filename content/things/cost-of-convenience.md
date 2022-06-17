---
title: "The cost of convenience"
date: "2022-06-17"
live: true
socialmediaimage: "social2.jpg"
---

It is tempting to build abstractions so developers have to do less and build more. However, this can easily end up causing frustrations with developers if not done right.

<!-- more -->

Whenever I take a library or a framework for a test drive, work through their “Getting Started” guide or browse the example code, I try to observe my own reaction. Whenever something makes me go “this feels wrong”, I make note of it and try to distill what I would have done differently. In this blog post, I try to figure out what I think makes a good developer experience.

## The Web Platform

The Web Platform is a beautiful mess. It has been expanded and evolved by hundreds (thousands?) of people over the last couple of decades. It evolved from a document platform to an extremely capable app platform. The pace at which it is progressing is steadily increasing, too. This certainly has left stretchmarks. Some APIs on the Web Platform are decades old, while others barely have a couple of months under their belt. Every API can only make use of what the web had to offer at the time of inception, which leads to the notoriously inconsistent API surface. For example, many old APIs would benefit from JavaScript’s `async`/`await`, but that feature only landed in JavaScript in the late 2010s. As [Paul Kinlan] blogged a while ago, [the web is “lumpy”][lumpy web].

Another contributing factor is the fact that a lot of the Web Platform has been designed with the [Extensible Web Manifesto] in mind, which prioritizes _low-level_ primitives and pushes the burden of building higher-level abstractions onto the ecosystem. High-level APIs are only getting baked into the platform once they have been tried, tested, and deemed successful. As a result, there is an extremely high variance in the levels of abstraction of  Web APIs. On the one end of the spectrum, there’s something like [WebAssembly], a low-level VM that doesn’t provide any convenience but can do pretty much anything. On the other end of the spectrum is [CSS], a declarative styling language that makes complex layouts and animations easy on any device, but lets you only do what it has declarative syntax for.

And lest we forget, the Web Platform is owned by everyone and no one in particular, which means progress and consensus is a lot harder to come by than, say, Android or iOS. It has multiple, independent, often slightly diverging implementations. This has obvious downsides, but also advantages which are, admittedly, more subtle and not always very immediate.

In summary, the web is uneven across at least three dimensions: Level of abstraction, API design and  availability/behavior across browsers. It’s all really lumpy.

<figure>
	<picture>
		<img  width=1024 height=1024 src="./platform.jpeg" alt="A platform with multiple blocks of different sizes and height. Each block represents a Web Platform API, while the block’s height represents the level of abstraction that API has.">
	</picture>
	<figcaption>The Web Platform exposes many API surfaces of different sizes and with different levels of abstraction.</figcaption>
</figure>

In general, web developers embrace this Web Platform, despite its flaws. They learn HTML, JavaScript, CSS. They learn the quirks of `pushState` and fall in love with the more modern additions like CSS Grid or `async`/`await`. Not to mention the things they have to learn about the tooling ecosystem (`npm`, [Rollup], [Webpack], [vite],...).

Of course, there are still gaps and shortcomings in the platform, and those are often addressed through libraries or frameworks, which I will group under the term “abstractions”.

## Learning & fixing

No matter from whose perspective you are reading this, there is a universal truth: Developers want to build _something_. And usually, they want to get it done. The ecosystem is starting to focus on that more and more, designing abstractions to make many processes simpler and quicker. I think that is a good thing, and the problem lies not in the “what” but in the “how”:

**I get frustrated whenever I have knowledge (specifically Web Platform knowledge) to solve a problem, but the abstraction prevents me from using my knowledge.**

By complete coincidence, [Evan You] voiced a similar feeling:

<figure>
<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I noticed that I get extra frustrated, sometimes almost angry when a tech product (especially software) breaks in a way that I can’t fix. Maybe I’m too used to being able to hack the source code of my npm deps.</p>&mdash; Evan You (@youyuxi) <a href="https://twitter.com/youyuxi/status/1535987671868137472?ref_src=twsrc%5Etfw">June 12, 2022</a></blockquote>
<figcaption>Evan You is frustrated about being unable to use his skills.</figcaption>
</figure>

This made me realize something counter-intuitive: While the uneven shape of the Web Platform may seem like a major source of friction, it’s likely that the developer has already learned and mastered it. If developers are _forced_ to use an abstraction instead of their pre-existing skills, it might not feel like a net positive for them.

Let me explain my thinking in a bit more detail.

## Libraries & frameworks as abstractions

The distinction between “library” and “framework” has always been a matter of debate. I will not pretend that I can settle that debate, but for the context of this blog post, I’ll use the following mental model.

I distinguish between a library and a framework by looking at the _Inversion of Control_. When I use a library, I slot the library into my code and call into the library in the appropriate places. A framework, on the other hand, makes itself the center of the universe and offers slots _for me to slot into_. It’s the Hollywood principle: You don’t call the framework, the framework calls you.

This inversion of control is not inherently bad. After all, the framework was designed to be in this place and probably provides some pretty sophisticated machinery to make code easier to write, run more efficiently or utilizes other peripheral better.

<figure>
	<picture>
		<img  width=1024 height=1024 src="./framework.jpeg" alt="The platform is hidden by a nicely shaped and aesthetically pleasing layer at the top, with some blocks underneath forming the pillar that hold it up.">
	</picture>
	<figcaption>Frameworks abstract the underlying platform and call your code.</figcaption>
</figure>


Especially abstractions that make it easier to write code have become incredibly popular, which only reinforces the trend of making a “good DX” a core part of a project. Abstraction authors want to take work off of developers and dig a [pit of success] for them. However, I believe that we haven’t figured out when and how to give a developer access to an abstraction or how to evaluate when an abstraction is worth using. Abstractions are usually designed for a set of specific use-cases. The problems, however, start when a developer wants to do something that the abstraction did not anticipate.

## Escape hatches

When the abstraction proves to be insufficient or overbearing, it is often necessary to _pierce_ the abstraction and work under the hood. In some cases that means just not using the abstraction. However, as frameworks often put themselves at the core of any architecture, it can be hard to opt out. After all, the developer’s code is written for the framework and can’t run without it. To address this, frameworks sometimes provide intentional holes in their abstraction, little “escape hatches”, that allow the developer to access the underlying platform primitive. For example, React has the [`ref` property][ref] to get ahold of a component’s corresponding DOM element, exposing the underlying platform primitive.

> **Offramp:** For me, this is one of the benefits of libraries vs frameworks. Especially at a larger scale, you start by using a framework, but at some later point in time, you find yourself having outgrown the framework (or the framework has stagnated for too long), and you want to switch. This can be really hard, because frameworks shape your code, and each framework is different, so there is no easy migration path. The contact surface with libraries, on the other hand, is often very small, making a switch from one library to another a much smaller task, with a low blast radius.

Escape hatches are, in my opinion, an absolute necessity in any library or framework. It is near impossible to anticipate every possible use case, and providing escape hatches allows developers to work around a restriction and keep moving rather than getting stuck.

The downside of escape hatches, especially in frameworks, is that developers often drop _all_ the way down to the platform. This can pose a challenge for the developer, as they now have to re-do the work the framework did for them previously: Working their way up from a potentially low-level platform primitive to the abstraction level of the framework. The bigger the gap between framework and platform, the more work that entails for the developer.

<figure>
	<picture>
		<img  width=1024 height=1024 src="./escapehatch.jpeg" alt="The top layer has become transparent, the pillars have disappeared. The gap between the top layer and the platform feels large.">
	</picture>
	<figcaption>While escape hatches are critical, they often put a burden on the developer having to now manually fill the gap between platform and framework.</figcaption>
</figure>

In the end, providing escape hatches is both necessary to not restrict developers, but is also not ideal as they can be quite costly for developers to use.

## Pattern Reuse

Another part that abstractions often seem to get wrong is not reusing the patterns and idioms established by the Web Platform. This is not a [`#useThePlatform`][polymer platform] revival, but rather motivated by my observations about forced learning: If developers already have a skill but are forced to spend time learning a new way _to do the same thing_, frustration happens. Doubly so if there is no tangible benefit of doing it “the new way”, apart from maybe idiomaticism or purity.

One example here could be how data passing from a child to a (far-away) ancestor works in React. Since the era of Web Components and extendable `Event`, I know how to dispatch a custom event and have the ancestor element listen for it. React with its impedance mismatch between component tree and DOM made that pattern hard. Of course, it has its own solutions: Explicitly passing a callback down via props or putting it in a context. The first is really inconvenient and the other I have to learn _for no clear benefit_, apart from the fact that it’s idiomatic because it’s yet another React component.

In my opinion, it is especially important to reuse patterns in tutorials or “Getting Started” guides. These resources are used by newcomers, and nothing is more discouraging than to be greeted with a wall of new concepts and idioms that have to be understood and internalized just to take the first steps. If you care about DX and the adoption of your abstraction, it is much more beneficial to let developers use as much of their existing skills as possible and introduce new concepts one at a time. As a secondary benefit, by intellectually elevating the developer from platform to abstraction _slowly_, they are much more likely to understand how the abstraction works and how they can help themselves when they get stuck.

## Opt-in or Opt-out

I’d summarize all of this as follows: **Frustration happens when the developer is _unable_ to use their existing skills or feels _disproportionally punished_ for doing it their way instead of your way.**

To phrase it another way: Abstractions that take work off of developers are valuable! Of course, they are. The problems only occur when a developer feels chained to the abstractions in a situation where they’d rather do something differently. The important part is to not _force_ patterns onto them.

By giving developers choices on how to tackle a problem, developers can help themselves, and this is something I sometimes feel isn’t thought about enough by abstraction authors. If the abstraction leans into platform patterns, or even exposes the underlying platform primitives, resources like StackOverflow can be used by a developer to get unstuck. If the abstraction is watertight or introduces new patterns, a new corpus of blog posts and other indexable media needs to land on the web so developers can get help.

In the end, it depends on the goal and the use case, whether an abstraction would fare better with an opt-in or an opt-out mechanism. But from now on, I am treating the “opt” part to be mandatory!

## Layered architectures

Many abstractions aim to sit on top of all primitives of the underlying platform. Sometimes this is done so that the underlying platform can be switched out for another without requiring code changes (see React Native), sometimes it is done so that the abstraction can be in control of how and when the underlying platform is utilized. The tradeoff here, even with escape hatches, is that the developer is left with a binary choice: Either work on top of the abstraction or throw away _all_ utility provided by the abstraction and go back to the platform.

There is a way to support developers that have to resort to escape hatches, which will also improve the architecture of the abstraction overall: Build multiple abstractions that are built on top of one another. Like a ladder, or maybe like a parking lot. Each layer adds utility and convenience. Inevitably, by the nature of tradeoffs, it also adds opinions and constraints. Depending on what the developer knows and requires in any given situation, they can choose which layer provides the appropriate level of convenience and abstraction. They can drop down a layer (or two, or three...) on a case-by-case basis.

The lower layers should not aim to abstract away the platform. Instead they should embrace the primitives provided by the platform and follow the patterns & idioms established by the platform, as developers already learned them.

<figure>
	<picture>
		<img  width=1024 height=1024 src="./layers.jpeg" alt="The top layer is still transparent, but there two other translucent layers in-between, making the gap between platform and top layer feel less scary.">
	</picture>
	<figcaption>Providing incremental abstractions in the form of layers lets developers move up and down as needed without incurring a high cost.</figcaption>
</figure>

Another benefit of this approach is that it forces proper dogfooding of the abstractions. If you are strict about it, any given layer should only be using the layer below (and platform primitives) to implement its functionality. If that succeeds, you can be sure that it will be a useful _escape layer_ for developers. Whenever that principle is broken, it’s a sign that the underlying layer is either abstracting too much or doesn’t provide enough utility.

Let me try and illustrate all of this with an example.

### Example: Design systems

Design systems right now seem to come in two flavors: A CSS-only library where developers can copy/paste some markup that makes use of the classes from the CSS library — or — a collection of React components.

Of course, if they are a React user, it’s happy days. They pick the React version and get the look-and-feel with basic component functionality readily implemented. However, if one of the React components isn’t behaving (or looking) the way they need, the developer has three paths to explore:

1. They use React’s `ref` escape hatch and monkey-patch (provided the components are using [`forwardRef`][forwardRef]).
2. They fork the component (i.e. copy/paste the implementation) and change it to their liking (which often doesn’t work when implementations depend on multiple non-exposed utility functions).
3. They drop all the way down to HTML + CSS only and reimplement all behavioral logic themselves (which is not only a lot of work but can easily double-load the entire CSS).

If they are using a different framework than React, they have no choice but use option 3. That’s a lot of work they have to redo.

How could this be different with a layered approach? One extremely valuable, additional layer would be an implementation of the components using Web Components. Web Components are a platform primitive that are well-understood and tested. They would be implemented using the CSS library, which will also be a forcing function to ensure the CSS library is modular and tree-shakable. Web Components can be implemented with behavior and interface similar to existing platform elements, making them feel familiar to web developers. Of course, having a React version is still extremely beneficial given how popular and widespread React is. However, the React version of the design system should now make use of the Web Components, reducing it to a thin wrapper. Long story short, we end up with 3 layers: Pure CSS, Web Components, React.

The benefits here are that React developers can use React. But when a component doesn’t quite do what they need (or has a bug), they can drop down a level and orchestrate Web Components, on a case-by-case basis, without having to give up all the tried-and-tested implementation work. People who prefer using other frameworks like [SolidJS] or [Svelte], can use the Web Components layer and only have to provide a framework-idiomatic wrapper for those custom elements, rather than start from scratch.

Of course, this is just an example. The layered approach works beyond design systems. It can be applied to developer tooling like CLIs, GraphQL APIs or UI design. It even applies to other ecosystems — the web’s lumpiness and JavaScript’s fragmented ecosystem just make the benefits extra clear.

## Conclusion

At the core of the mental model is to think about what the target developer audience is for any given abstraction, and what skills these developers are likely to bring to the table. The abstraction should rely on these skills to minimize cognitive friction by reusing concepts, and stagger the introductions of new concepts in the onboarding flow (i.e. tutorials, “Getting Started” docs, ...). Every abstraction should ideally be optional (opt-in or opt-out) and come with escape hatches. If possible, it should also expose the abstractions below the top layer, so developers are in control and can help themselves.

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
[forwardref]: https://reactjs.org/docs/forwarding-refs.html
[solidjs]: https://www.solidjs.com/
[svelte]: https://svelte.dev/
[pit of success]: https://blog.codinghorror.com/falling-into-the-pit-of-success/