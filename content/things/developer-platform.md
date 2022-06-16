---
title: "The cost of convenience"
date: "2022-06-09"
live: false
socialmediaimage: "framework.png"
---

It is tempting to build abstractions so developers have to do less and get to build stuff faster. However, this can easily end up causing frustrations with developers if not done right.

<!-- more -->

For the longest time, I worked as a Developer Advocate for the Open Web Platform, exploring when building apps on the web platform rather than directly on any mobile platform is advantageous, and what these advantages are. It’s certainly a challenging pitch at times.

I now work at Shopify, focusing on their Developer Experience (DX). Shopify is a platform itself and provides a plethora of tools, libraries and frameworks for for developers. Many of them are great. Some others made me go “this feels wrong” when I took them for a test drive. I tried to figure out what made me dislike certain things. The result is this blog post.

## The Web Platform

The Web Platform is a beautiful mess. The Web Platform has been expanded and evolved by hundreds (thousands?) of people over the last couple of decades. It evolved from a document platform to an extremely capable app platform, and the pace at which it is evolving has increased as well. This certainly hasn’t happened without leaving stretchmarks. Some APIs on the Web Platform are decades old, while others barely have a couple of months under their belt. Every API can only make us of what the web had to offer at the time of inception, which leads to the notoriously inconsistent API surface. For example, many old APIs would benefit from JavaScript’s `async`/`await`, but that feature only landed in JavaScript in the late 2010s. As [Paul Kinlan] [blogged][lumpy web] a while ago, the web is “lumpy”.

Another contributing factor is the fact that a lot of the Web Platform has been designed with the [Extensible Web Manifesto] in mind, which prioritizes _low-level_ primitives and pushes the burden of building higher level abstractions onto the ecosystem. High-level APIs are only getting baked into the platform once they have been tried, tested and deemed successful. As a result, the levels of abstractions of Web APIs have an extremely high variance. On the one end of the spectrum there’s something like [WebAssembly], a low-level VM that doesn’t provide any convenience but can do pretty much anything. On the other end of the spectrum is [CSS], a declarative styling language that makes complex layouts and animations easy on any device, but lets you only do what it has declarative syntax for.

And lest we forget, the Web Platform is owned by everyone and no one in particular, which means progress and consensus is a lot harder to come by than, say, Android or iOS. It has multiple, independent, often slightly diverging implementations. This has obvious bad consequences, but also many good ones which are, admittedly, more subtle and not always very immediate.

So the web is uneven across three dimensions: Level of abstraction, API design and API availability & behavior across browsers. Really lumpy.

<figure>
	<picture>
		<img src="./platform.png" alt="A platform with multiple blocks of different sizes and height. Each block represents a Web Platform API, while the block’s height represents the level of abstraction that API has.">
	</picture>
	<figcaption>The Web Platform is vast. It exposes many API surfaces of different sizes and with different levels of abstraction.</figcaption>
</figure>

Web developers, in general, embrace this The Web Platform, despite its flaws. They learn HTML, JavaScript, CSS. They learn to embrace the arcane Web Platform APIs like `pushState` and love the more modern additions like CSS Grid or `async`/`await`. Not to mention the things you have to learn about the tooling ecosystem (`npm`, [Rollup], [Webpack], [vite],...).

Of course, there are still gaps and shortcomings in the platform, and those are often addressed through libraries or frameworks, which I will group under the term “abstractions”.

## Learning & fixing

No matter from whose perspective you are reading this, there is a universal truth: Developers want do build _something_. And usually, they want to get it done. From what I could tell, the DX ecosystem by Shopify understood that. The abstractions tried to make many processes a lot simpler, quicker and tailored to the use-case. After a bit of reflection, I realized that the problem lied not in the “what” but in the “how”:

**I got frustrated whenever I had knowledge (specifically Web Platform knowledge) to solve a problem, but the abstraction prevented me from using my knowledge.**

By complete coincidence, [Evan You] voiced a similar feeling that week:

<figure>
<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I noticed that I get extra frustrated, sometimes almost angry when a tech product (especially software) breaks in a way that I can’t fix. Maybe I’m too used to being able to hack the source code of my npm deps.</p>&mdash; Evan You (@youyuxi) <a href="https://twitter.com/youyuxi/status/1535987671868137472?ref_src=twsrc%5Etfw">June 12, 2022</a></blockquote>
<figcaption>Evan You talking is frustrated about his tools being taken away.</figcaption>
</figure>

This makes me arrive at a conclusion that might feel counter-intuitive: While the uneven shape of the Web Platform may seem like a major source of friction, it’s likely that the developer has already learned and mastered it. If you _force_ the developer to use your abstraction, it might not be a net-positive for them.

Let me pull this apart a bit further.

## Libraries & frameworks as abstractions

The distinction between “library” and “framework” has always been a matter of debate. I will not pretend that I can settle that debate, but for the context of this blog post, I’ll use the following mental model.

I distinguish between a library and a framework by looking at the _Inversion of Control_. When you use a library, you slot the library into your code and call into the library in the appropriate places. A framework, on the other hand, makes itself the center of the universe and offers slots _for you to slot into_. It’s the Hollywood principle: You don’t call the framework, the framewark calls you.

This inversion of control is not inherently bad. After all, the framework was designed to be in this place and probably provides some pretty sophisticated machinery to make your code easier to write, run more efficiently or utilizes other resources better. Another upside of frameworks is that they usually provide elegantly designed and modern interfaces.

<figure>
	<picture>
		<img src="./framework.png" alt="The platform is hidden by a nicely shaped and aesthetically pleasing layer at the top, with some blocks underneath forming the pillar that hold it up.">
	</picture>
	<figcaption>Frameworks (at least partially) abstract the underlying platform and call your code in the right moments.</figcaption>
</figure>

Especially abstractions that make it easier to write code have become incredibly popular. As a result, I think more and more abstractions make a “good DX” a core part of their mission, but I believe that we haven’t mastered how to decide which abstractions are worth it. As with any abstraction, some use-cases were thought when the abstraction was designed. The problems, however, start when a developer wants to do something that the abstraction did not antipicate.

## Escape hatches

When the abstractions provided by a library or framework prove to be insufficient or overbearing, it is often necessary to _pierce_ the abstraction and work  under hood. In some cases that means just not using the abstraction. However, as frameworks often put themselves at the core of any architecture, it can be hard to just opt-out. As a result, frameworks sometimes provide intentional holes in their abstraction, little “escape hatches” that allow you access the underlying platform primitive. For example, React provides the [`ref` property][ref] do get access an components underlying DOM element, giving you access to the Web Platform primitive.

Escape hatches are, in my opinion, an absolute necessity in any library or framework. It is near impossible to anticipate every possible use-case, and providing escape hatches allows developers to work around a restriction and keep moving rather than getting stuck. (Whether or not a code change in the abstraction that breaks escape hatch users should be considered a breaking change, is an interesting discussion that I will not get into here.)

<figure>
	<picture>
		<img src="./escapehatch.png" alt="The top layer has become transparent, the pillars have disappeared. The gap between the top layer and the platform feels large.">
	</picture>
	<figcaption>While escape hatches are critical, they often put a burden on the developer having to now manually fill the gap between platform and framework.</figcaption>
</figure>

The downside of escape hatches, especially in frameworks, is that you often drop _all_ the way down to the platform. That can be fine. At other times, it can pose a challenge for the developer, as they now have to re-do the work the framework did for them previously: Working their way up from a potentially low-level primitive to the abstraction level of the framework. The bigger the difference in level of abstraction between framework and platform, the more work that entails for the developer.

In the end, providing escape hatches is both necessary to not restrict developers, but is also not ideal as they can be quite costly for developers to use.

## Patterns

The other part that new abstractions seem to get wrong is not reusing the patterns established by the Web Platform. This is not a [`#useThePlatform`][polymer platform] revival, but rather motivated by my observations about Shopify’s DX: It is frustrating for developers to have a skill and instead of being able to use it, being forced to learn a new skill to fulfill the same purpose. Frustrations grew even more when instead I _had_ to learn something new to solve the same problem a different way, at no tangible benefit (apart from idiomaticism or purity).

One example here could be React components and how you pass data from a child to a (far-away) ancestor. Since the era of Web Components and extendable `Event`, I know how to dispatch a custom event and have the ancestor element listens for it. React with its impedance mismatch between Component Tree and DOM made that pattern hard. Of course it has its own solutions: Explicit prop passing or Contexts. The first is really inconvenient and the other I have to learn _for no benefit_.

## Opt-in or Opt-out

I’d summarize this as follows: Frustration happens when the developer is _unable_ to use their existing skills or knowledge, or feels _disproportionally punished_ for using a mechanism to do it their way.

To phrase it another way: Abstractions that take work off of developers are valuable! Of course they are. The problems only occur when a developer feels chained to the abstractions in a situation where they’d rather do something differently. The important part is to not _force_ things onto them.

This is also important as it allows developers to help themselves, something that I sometimes feel isn’t thought about enough by abstraction authors. If the abstraction leans into platform patterns, or even exposes the underlying platform primitives, resources like StackOverflow can be used by a developer to get unstuck. If the abstraction is watertight or introduces new patterns, a new corpus of blog posts and other indexable media needs to land on the internet so developers can see how others have worked around a problem they are encountering.

In the end it depends on the goal and the use-case, whether an abstraction would fare better with an opt-in or an opt-out mechanism. But from now on, I recommend the “opt” part to be mandatory!

## The pitch: Layers

Here’s the not-new-at-all insight I arrived at: Many abstractions aim to sit on top of all primitives of the underlying platform. Sometimes this is done so that the underlying platform can be switched out for another without requiring code changes (see React Native), sometimes it is done so that the abstraction can be in control of how and when the underlying platform is actually utilized. The tradeoff here, even with escape hatches, is that the developer is left with a binary choice: Either work on top of the abstraction, or throw away _all_ utility provided by the abstraction and go back to the platform.

I think the better approach is to build multiple abstractions that build on one another, like a ladder. Each layer adds utility and convenience. Inevitably, by the nature of tradeoffs, it also adds opinions and constraints. Depending on what the developers knows and needs in any given situation, they can choose which layer provides the appropriate level of convenience and abstraction. They can even climb up or drop down a layer (or two, or three...) on a case-by-case basis. This means that the lower layers won’t necessarily be able to abstract away the platform. In fact, they shouldn’t. Instead they should embrace the primitives provided by the platform and follow their patterns, as developers already know them.

<figure>
	<picture>
		<img src="./layers.png" alt="The top layer is still transparent, but there two other translucent layers in-between, making the gap between platform and top layer feel less scary.">
	</picture>
	<figcaption>Providing incremental abstractions in the form of layers lets developers move up and down as needed without incurring a high cost.</figcaption>
</figure>

Another benefit of this approach is dog-fooding your own abstractions. If you are strict about any given layer only using the layer below (and platform primitives) to implement its functionality, you can be sure that it will be a useful escape _layer_ for developers. Whenever you need to cheat here and break that principle, it’s a sign that the underlying layer is either abstracting and hiding too much or doesn’t provide enough utility.

Let me try and illustrate all of this with an example.

### Example: Design systems

Design systems right now seem to come in two flavors: A CSS-only library where you copy/paste some markup that makes use of the classes from the CSS library — or — a collection of React components.

Of course, if you are a React user, it’s happy days. You pick the React version and get the look-and-feel with basic component functionality readily implemented. However, if one of the React components isn’t behaving (or looking) the way you need, you are faced with thee choices:
1. You use React’s `ref` escape hatch (provided the components are using [`forwardRef`][forwardRef]).
2. You fork the component (i.e. copy/paste the implementation) and change it to your liking (which often doesn’t work when implementations depend on multiple non-exposed utility functions).
3. Drop all the way down to HTML + CSS only and reimplement all behavioral logic yourself.

If you are using a different framework than React, you have no choice but use option 3. That’s a lot of work you have to throw away.

Let’s look at this when you use a layered approach: One extremely valuable, additional layer would be an implementation of the components using Web Components. Web Components are a platform primitive that are well-understood and tested. They should be implemented using the CSS library, which will also be a forcing function to ensure the CSS library is module and tree-shakable. Web Components can be implemented with behavior similar to existing platform elements, making them feel familiar to web developers. Of course, having a React version is still extremely beneficial given how popular and wide-spread React is. However, the implementation of the React version of the design system should now make use of the Web Components, making the React version a thing wrapping layer. Long story short, we end up with 3 layers: Pure CSS, Web Components, React.

The benefits here are that React developers can use React. But when a component doesn’t quite do what they need (or has a bug), they can drop down a level to orchestrating Web Components, _on a case-by-case basis_, without having to give up all the tried-and-tested implementation work. People who prefer using other frameworks like [SolidJS] or [Svelte], can use the Web Components layer and only have to provide a framework-idiomatic wrapper for those custom elements, rather than start from scratch. If anything, this also helps grow the ecosystem of community-provided wrappers for your design system.

## Conclusion

The layered approach is beneficial for more than just design system. It also goes beyond code. A lot of time I find myself thinking in this system when CLIs are hiding _too much_ from me and taking control away from me. Most of the convenience and abstraction your DX offering provides should have an opt-out, and maybe even be opt-in by default. Leaving developers in control and giving them options lets them move fast and be productive.

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