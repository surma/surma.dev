---json
{
  "title": "Headless Web Development",
  "date": "2018-10-05",
  "socialmediaimage": "camera1.jpg",
  "live": "true",
  "authorname": "Paul Lewis",
  "authorlink": "https://twitter.com/aerotwist"
---

I love photography. I love checking out what people are snapping on Instagram, I watch YouTube videos on how to take and edit my own photos, and above all I love capturing a special moment in time of a person, a place, or a thing.

A few years ago (actually quite a few now I think on it) I bought my first DSLR, the mighty Canon 400D. It came with one lens, the kit lens, which has a zoom of 18-55mm. The reason that particular lens comes with so many Canon DSLRs is that it’s great for a few different kinds of photography; at 18mm you’ve got what’s known as a wide angle, and at 55mm you’re zoomed in quite a bit. It’s like this general purpose lens, which is perfect when you’re getting started.

![Photo by NeONBRAND on Unsplash](camera1.jpg)

Within, oh I don’t know, 10 seconds, I got to realizing that I was going to do my typical “n+1” thing, because, once you have _n_ lenses, what you really need now is the next one aka _n+1_. Maybe a lens that would let me take better portrait photos of people. Oh and maybe another for taking landscapes. Perhaps I ought to consider a telephoto lens so I can do shots of things _really_ far away! You get the idea.

The neat thing about DSLRs is that you can swap lenses, but the body of the camera stays _exactly_ the same. Every DSLR camera manufacturer does this; they standardize their lens mounts, which means they can sell you different lenses for different jobs while allowing you to keep the same camera body. In summary: **different lenses for different jobs, but the business logic — the core action of photography taking pictures — is in the body, and between them is a standardized mount system.**

I feel at this point I want to show how this idea can apply to the web, and to do that I need to mention Surma’s previous article about [actors and The Actor Model](/things/lights-camera-action), since I’m going to build on that with what I’m going to say here. You should read his article if you haven’t already, but here’s the important bit: in the Actor Model that he mentioned (fun fact, it’s actually 45 years old this year!) there are distinct roles attached to individual pieces of an app, say one for state, one for the UI, one for storage. They do one thing, they do it really well, and they act as a gatekeeper for that one thing. Where those actors live in terms of main thread or workers or wherever is something of a secondary concern, because they communicate to one another _via a message bus_, and the messages they pass around are standardized so that there’s a ‘data contract’ between the actors.

Let’s imagine you have an actor whose job is to manage state. I guess in many ways that would be like the camera body, because the camera body knows what setting the camera is using, whether to focus automatically or manually, and what the lens should focus on. It’s the heart of the app. Here the actor knows the key data that’s important to the app, but essentially it can be ‘headless’, like a camera with no lens mounted at all. No DOM, no anything. Its job is to manage state and nothing else, and since that’s the case one could happily run that actor in a web worker away from the main thread, away from any UI, if desired.

![Photo by SplashGrid on Unsplash](camera2.jpg)

And it _is_ desirable. I don’t know if you noticed, and honestly I didn’t notice the first time this idea cropped up (sure that was a photography pun I did just there), but there was a subtle power switch that just occurred. If you run an actor to handle state in a headless environment like a worker, you have effectively freed up your app to use different “UI actors” depending on the needs you have. In the same way you can have different camera lenses for different occasions, so you can now have different “UI actors” for different environments. If you need a typical UI of today, boot up a DOM-based UI actor on the main thread (like the kit lens). If you need VR, or AR, or a text-based interface, boot a different actor (much like switching to a wide angle or telephoto lens). Unlike the camera body, however, you actually have even more flexibility because you can boot multiple actors at the same time. The only requirement that you have is that, just like the camera lenses, there has to be a standardized mount.

The Actor Model, much as with cameras, seems to unlock a very special world where two new things are possible:

1. **You can run multiple ‘heads’, or modalities.** Fancy word, modalities, but imagine you were making a chess game. It could support a DOM-based interface, a VR-based interface, or a text-based interface. So long as a given ‘head’ can communicate in the right way through the message bus, it can work in this architecture. That means you can add additional heads as needed, or as platform features become available, which is future-proofing and awesome.
2. **The browser is theoretically free to move work around.** I say theoretically because today no browser does this, but it’s not a big leap to imagine a world where an actor could be statically analyzed, and if it doesn’t -- say -- need to access the DOM, it could be run in a worker, server-side, or wherever. The key here is that the message bus is the mechanism by which actors communicate, and that message bus can use any transport it needs (fetches, BroadcastChannel, you name it). Ideally any actor can be considered ‘sealed’ (think functional programming), which means any local state is encapsulated, and it is capable of communicating via messages only.

What’s the downside here? Compared to today there’s some thinking to do to ‘actorize’ the web. We’re used to the convenience of having everything in one place and things calling one another ‘directly’ instead of via a message bus. This would be like having a point-and-shoot camera, or even a phone, with a fixed lens. It works, to a point, but as we talked about in our first post we’ve overloaded the main thread to the point where we often have detrimental performance. Without doubt there’s some overhead to having a communication transport between actors, but what you gain? You gain a lot. You get the benefits of thinking about local concerns, the freedom to move work wherever there’s capacity, you get to be async by default (because you need to account for the message passing), and you can more easily embrace a future which supports multiple ‘outputs’ like VR, AR, or voice.

So when you think of cameras and lenses, you’re really seeing something like [The Actor Model](/things/lights-camera-action). The Actor Model is a particularly good fit for the web, and it unlocks a very exciting future!

}
---

While I have written this article, ideas and thoughts don’t happen in a vacuum. Specifically, in this case, [Surma](https://twitter.com/DasSurma) can be thought of as the co-author of this series, since most of it has come from our many conversations together.

But there are others, too, who deserve to be mentioned because they have contributed, either knowingly, or just by saying or doing the right thing at the appropriate time: [Doug Fritz](https://twitter.com/dohug), [Paul Irish](https://twitter.com/paul_irish), The Chrome DevTools team, and [Nolan Lawson](https://nolanlawson.com/).

There are probably others, too.

Standing on the shoulders of giants here, people.

