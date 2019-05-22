---json
{
  "title": "Lights, Camera, Action!",
  "date": "2018-09-27",
  "socialmediaimage": "3manteam.jpg"
}
---


Whenever [Jake](https://twitter.com/jaffathecake) and I shoot a new episode of [HTTP203](https://www.youtube.com/watch?v=Nzokr6Boeaw), you see the two of us having an incessantly long conversation. What you _don’t_ see is the crew of people that work quite literally behind the camera: lights have to be dimmed, as much voice with as little noise as possible has to be recorded, cameras have to be started and focused. All of that material then gets cut, edited, graded, polished and subtitled. Each of these activities have a dedicated person, whose sole responsibility it is to make sure their assigned field is the highest possible quality.

![Boom operator and a camera operator — Photo by Nik MacMillan on Unsplash](boom.jpg)

The camera operator makes sure the right things are in frame, are in focus and that the camera is recording at the right time. The boom operator holds the boom, has sole control over the audio recording equipment and constantly listens for undesired background noise. **While these two operators will communicate with each other, they won’t change each other’s equipment or settings**. They will synchronize with verbal communication as to who or what the main subject of the current scene is, but only the respective owner gets to touch the equipment. If the director wants the shot to be different, they’ll talk to both the camera operator and the boom operator, not move the camera themselves.

This means that every operator can focus their attention on their own equipment. The camera operator, for example, is free to adjust the focus mid scene because they know that no one else is trying to adjust the settings of the camera.

## YouTube
The current state of web is more like a new YouTuber: a single person doing everything. They set up the camera, record the audio, arrange lighting. Then, after filming, they handle all the post-production requirements. If something needs changing, they need to do it themselves. It’s a lot of work, and requires balancing a lot of tasks at the same time.

**This does not scale**. As Paul pointed out in [part 1](/things/the-9am-rush-hour) of this series, we need a paradigm shift in how we think about work in our web apps. Currently, all the heavy lifting is done by the main thread alone. We have an old and well-supported API to move work off the main thread in **Web Workers**, but their adoption has been low.

![Currently, the main thread does all the heavy lifting — Photo by Alora Griffiths on Unsplash](buff.jpg)

One factor is probably the lack of precedent for web developers to move work off the main thread. As Paul said, it’s hard to question this norm. But even if you did convince yourself that parallelism is beneficial for your app, the API that Web Workers impose on you can feel uncomfortable. You only have `postMessage` to send JSON-style messages between the main thread and a worker. No function calls. No shared variables. In short, no convenience.

But what if we took a page from a professional video crew’s playbook?

## The 70s called, they want their paradigm back
What if crucial resources were assigned an operator with whom we could communicate via messages, but the resource itself cannot be touched by anyone but the operator. This pattern is known in computer sciences as **the Actor Model** (where operators are called “actors” instead) and has been published in 1973. One of its most popular implementations is Erlang which to this day has a vibrant community.

![Members of a video crew — Photo by Stephane YAICH on Unsplash](3manteam.jpg)

If we apply this model to the web, the separation of main thread and other threads with their message-based API becomes a lot more intuitive. The main thread is the actor for the DOM and UI events. Nobody can directly change the DOM or subscribe to events. Only the main thread as assigned actor can do so. If another actor wants to change something on the DOM, it has to do so with messages to the DOM actor. You could, for example, have a dedicated actor to manage your application’s state, another actor to fetch and process your app’s server-side API and another actor to run your high-throughput wasm modules.

**Embracing the actor model leads to highly modular and concurrent code**. With primitives like [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) the developer doesn’t need to worry about _where_ an actor is run. It could be the main thread, it could be a worker. As long as the messages arrive, the code will continue to work. This also means that there’s not necessarily a one-worker-per-actor relationship. While you can scale it that way, there’s nothing preventing you from, let’s say, running all UI-related actors on the main thread, and all other actors in one web worker.

We can learn a lot about patterns and ergonomics in an actor-driven architecture from its implementations and communities like Erlang, Elixir, Pony and many more. It gives us a model that helps us structure our code to fit Web Workers and their messaging paradigm into the web app development story. It helps us make decisions as to which code can be lifted off the main thread and get its own actor.

In my opinion, this is something the web urgently needs. An architecture that distributes critical resources to other actors way to structure your code for performance, modularity and maintainability.

---

While I have written this article, ideas and thoughts don’t happen in a vacuum. Specifically, in this case, [Paul Lewis](https://twitter.com/aerotwist) can be thought of as the co-author of this series, since most of it has come from our many conversations together.

But there are others, too, who deserve to be mentioned because they have contributed, either knowingly, or just by saying or doing the right thing at the appropriate time: [Doug Fritz](https://twitter.com/dohug), [Paul Irish](https://twitter.com/paul_irish), The Chrome DevTools team, and [Nolan Lawson](https://nolanlawson.com/).

There are probably others, too.

Standing on the shoulders of giants here, people.

