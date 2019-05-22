---json
{
  "title": "The 9am rush hour",
  "date": "2018-09-21",
  "socialmediaimage": "taxis.jpg",
  "author": {
    "name": "Paul Lewis",
    "bio": "Googler. Host of a channel on YouTube. Talks web and stuff.",
    "avatar": "paullewis.jpg",
    "socials": {
      "twitter": "https://twitter.com/aerotwist",
      "github": "https://github.com/paullewis",
      "website": "https://aerotwist.com"
    }
  }
}
---

One of the great joys of working at Google is seeing the big trends in web development. It’s genuinely awesome to see all the innovation and excitement around new ways of crafting experiences. Though, if I’m honest, there are other trends I see, too: developers still feel overwhelmed at the vast array of approaches and tooling, struggle with performance, and fight almost daily to create compelling apps & sites that work across devices and browsers.

This post is the first in a series where we look at some of these challenges, and attempt to suggest possible solutions and strategies. So what to begin with? Let’s start with where we are.

It’s 8.30am on a Monday morning. You look out of your car or train window and you see something that looks like this. **Rush hour.**

![Cars in stand-still traffic. The 9am Rush Hour. Photo by Anouk Fotografeert on Unsplash](jam.jpg)

The worst time of day to travel. For many it’s not possible to travel at any other time of day because they need to get to work by 9am.

This is exactly what a lot of web code looks like today: **everything runs on a single thread, the main thread, and the traffic is bad**. In fact, it’s even more extreme than that: there’s one lane all from the city center to the outskirts, and quite literally everyone is on the road, even if they don’t need to be at the office by 9am. It really is one of the trends I see, and you don’t normally have to go far to find stats (Look at [HTTP Archive](https://httparchive.org/) or one of [Alex Russell](https://twitter.com/slightlylate)’s many tweets) that show that there’s more code than ever on the main thread and it’s looking to increase over time.

It’s hard to question this norm. We load our JavaScript, it runs as and when it needs to, and we’ll do what we can to maybe run it async or deferred. But honestly we have a bunch of other constraints to think about: we have Marketing saying that the masthead image for this month’s promotion is everything, we know that Business Development wants to run analytics to understand customers, Project Managers are expecting us to ship features, and people will snark tweet if stuff isn’t performant or doesn’t work across browsers.

Okay, what _can_ we do about it? Taking the case of the roads there are a few options, which range in effectiveness and pragmatism:

1. **Increase capacity**. Essentially make more roads.
2. **Move traffic to other roads**. In the UK you can’t ride a bike on a motorway (highway if you prefer) because, well, you’d almost certainly be injured or killed due to the speed at which other traffic is going. This, then, is traffic that is only allowed to use certain types of road.
3. **Stagger traffic**. Instead of everyone traveling at 8.30am, if people were able to shift their work days and we could spread traffic out over the course of the day then theoretically the roads ought to be, on average, quieter.

What would these three look like if we applied these concepts to the web?

## Increase capacity
Year on year companies ship better phones, that is true. However, it’s also true that the _lower_ bar has actually _gone down_, such that the gap between entry level and flagship devices has never been wider. In essence, then, relying on increased capacity would be similar to telling someone that they need a supercar to drive on a given road, or, in our case, ‘please upgrade your phone or computer to something “good enough”’. I personally can’t imagine telling someone to do that, especially if what they had was all they could afford, and I don’t think we should ever bank on increased resources to mask capacity issues. True of transport, true of code.

## Move traffic to other roads
An important distinction we ought to make here, particularly when it comes to JavaScript, is _which traffic deserves to be on the main thread_. The answer is simple, but not necessarily easy: **the UI**. Only the UI deserves to run on the main thread. This is the thread that has to account for user interactions through JavaScript, and where tasks like style calculations, layout, and paint occur. Other work, like diffing virtual copies of the DOM, analytics, fetching resources, or other business logic has little to no place on the main thread.

We actually have the option to move non-UI traffic today: **Workers**. Since options like React / Preact use virtualized copies of the DOM that don’t technically need to interact directly with the real DOM until patches are applied, this is something that we should look into more thoughtfully.

There are very few notable cases of people making good use of Workers, which is a shame. (I always think of Nolan Lawson’s [Pokedex](https://pokedex.org/) app, which did a great job here!) True enough, it can be painful to navigate postMessage with Workers, and without doubt most of the abstractions many of us rely on day to day are not built with Workers in mind, but if we accept the premise that the main thread is often in a ‘traffic jam’ and overworked, then by extension we need to seek ways to alleviate the traffic. The Worker is our primitive for doing that.

## Stagger traffic
Unlike the real world, where people work collaboratively in businesses and need to be collocated at 9am to 5.30pm in the same office (generally speaking), there is rarely a case where code must all be run at the same time.

If we have moved non-UI code to a Worker, we are still left with some necessary UI-centric JavaScript that runs on the main thread. Here there are several signals one could use to decide if a given piece of UI needs to update urgently, the key one being “it’s on the screen right now”. If it isn’t on screen, delaying its update until there’s idle time is a reasonable way to orchestrate the update.

![Tick tock, tick tock. Perhaps we need a scheduler? Photo by Jon Tyson on Unsplash.](clocks.jpg)

Recently Philip Walton wrote [a must-read article on a strategy he called Idle-Until-Urgent](https://philipwalton.com/articles/idle-until-urgent/), which treats UI work as non-essential by default and only upgrades render priority when certain criteria are met. As I mentioned above, my own personal preference is “it’s on the screen right now”, but even within that single criterion some components are likely to be more important than others; most likely the ones with which the user is interacting. If, for example, they want to compose an email, that’s the most important component bar none.

What does this all point to? For me, a yet-to-exist scheduler that I think we need on the web platform. Whether you use requestAnimationFrame, requestIdleCallback, setTimeout, or setInterval, you will eventually hit the case where you create something scheduler-like, attempting to orchestrate a queue of discrete tasks. Or you won’t and you will run single long-running tasks that just updates everything in one go. And why wouldn’t you? It’s the default on the web today. Just like driving on the roads at rush hour.

We need better defaults. We need more organized traffic.

---

While I have written this article, ideas and thoughts don’t happen in a vacuum. Specifically, in this case, [Surma](https://twitter.com/DasSurma) can be thought of as the co-author of this series, since most of it has come from our many conversations together.

But there are others, too, who deserve to be mentioned because they have contributed, either knowingly, or just by saying or doing the right thing at the appropriate time: [Doug Fritz](https://twitter.com/dohug), [Paul Irish](https://twitter.com/paul_irish), The Chrome DevTools team, and [Nolan Lawson](https://nolanlawson.com/).

There are probably others, too.

Standing on the shoulders of giants here, people.

