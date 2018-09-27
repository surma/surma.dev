{
  "title": "Inbox Zero — but for web apps",
  "date": "2018-09-27",
  "socialmediaimage": "buff.jpg",
  "live": "true"
}

In [part 1](/things/the-9am-rush-hour) of this series [Paul](https://twitter.com/aerotwist) explained how a paradigm shift in how we think about work in our web apps can pave the way to good performance by default. One ingredient here is to distribute work to other places than the UI thread (or main thread) as currently, the UI thread is doing all the heavy lifting alone. On the web we really only have one API for this: **Web Workers**.

![Currently, the main thread does all the heavy lifting — Photo by Alora Griffiths on Unsplash](buff.jpg)

Web Workers have never been used that much. One factor is probably the lack of precedent for web developers to move work off the main thread. As Paul said, it’s hard to question this norm. But even if you did convince yourself that parallelism is beneficial for your app, the API that Web Workers impose on you feels alien for web developers. You only have `postMessage` to send JSON-style messages between the main thread and a worker. No function calls. No shared variables. In short: No convenience.

This is where we have to make a decision: Do we abandon the quest for alleviating backpressure on the UI thread and “just write better code” or is there a way we can make do with what we’ve got?

## Hire & Fire
You work in an office for a rather big company. **Your job is Senior Main Thread. Your inbox is full.** Not even close to zero. You have some serious work to do. Luckily, your manager has given you a budget to hire some helping hands to get your work done in time. Deadlines are constantly looming after all.

If your company works like the other giants in the industry (like the international conglomerate C++ Inc.), you’d look through your emails, hire a contractor and tell them to do a piece of work from that email. Once the contractor is done, they bring the results of their hard work to wherever it needs to go (bring it to a colleague, put it in a binder, fax it to another company...) and you fire them after. If you are still overloaded: Rinse, repeat.


![You wouldn’t be this happy if you had to micro-manage contractors — Photo by rawpixel on Unsplash](scrumstuff.jpg)

Now, there’s some problems here. You can of course hire multiple contractors to work on multiple things in parallel, but at some point problems can arise. Every new contractor needs to be set up in the office, get signed up for payroll, know their workspace, what to do, etc. Once that is out of the way, they start working but a copy machine can only be used by one person at a time. You might end up seeing queues of contractors forming in front of the copier. A resource congestion! Some tasks might call for a reply via email. But who sends that response? You? One of the contractors working on the task? If you don’t manage your contractors carefully, you might end up sending multiple responses or deleting the draft a previous contractor created, discarding all their work. It’s messy!

## The 70s called, they want their paradigm back
Everything old is new again. What if instead of the Hire & Fire approach, you hire long-term contractors. The initial cost of setting them up in the office can be spread out over a longer period of time. But more importantly, crucial resources like the copying machine can get assigned to a single contractor. Only they are allowed to use the copying machine. If anyone else needs a copy, they send an email to the contractor and request a copy of their document from them. As long as there are requests for copies, the contractor will keep making some. Using the copy machine non-stop, bringing a critical resource to its highest possible utilization. **It’s Inbox Zero. While it might seem that for an individual it can take longer to get a document copied, the average time to get a copy will go down.** The copy machine as a critical resource is utilized at the highest possible level.

The core concept here is that crucial resources are assigned a gatekeeper that can be contacted via message. This pattern is known in computer sciences as **the Actor Model** and has been published in 1973. One of its most popular implementation is Erlang which to this day has a vibrant community.

![Look what happens if you use the actor model — Photo by Vlah Dumitru on Unsplash](theater.jpg)

You, as Senior Main Thread are the gatekeeper for talking to externals. Only you have access to the those email addresses. If anyone else wants to contact an external person, they have to go through you by sending you an email. You are also responsible for receiving emails from externals and turn them into messages for the appropriate gatekeeper, depending on the topic. This ensures that you can always process incoming emails no matter how busy your contractors are.

## Tying it back to the web
You might say that I am just managing my contractors wrong — and you are probably right. But in the end it’s just a metaphor. Code does only exactly what you tell it to. Having a plan how to structure your actors to minimize tripwires will pay off in the long run. This is well-explored territory. The actor model has been around since the 70s. We can learn a lot from its implementations like Erlang, Elixir, Pony and many more. It gives us a model that helps us structure our code to fit Web Workers and their messaging paradigm into the web app development story. It helps us make decisions as to which code needs to be lifted off the main thread and get its own actor.

In my opinion, this is something the web urgently needs. An architecture that enables off-main-thread patterns. A way to structure your code for performance, modularity and maintainability.

---

While I have written this article, ideas and thoughts don’t happen in a vacuum. Specifically, in this case, [Paul Lewis](https://twitter.com/aerotwist) can be thought of as the co-author of this series, since most of it has come from our many conversations together.

But there are others, too, who deserve to be mentioned because they have contributed, either knowingly, or just by saying or doing the right thing at the appropriate time: [Doug Fritz](https://twitter.com/dohug), [Paul Irish](https://twitter.com/paul_irish), The Chrome DevTools team, and [Nolan Lawson](https://nolanlawson.com/).

There are probably others, too.

Standing on the shoulders of giants here, people.

