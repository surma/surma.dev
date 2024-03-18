---json
{
  "title": "“An Actor, a model and an architect walk onto the web...”",
  "date": "2017-12-27",
  "socialmediaimage": "gamedev.png"
}
---
Everything old is new again. Let’s take a concurrency model from the 70s and apply it to the web in 2017. Why? Well, read on, will ya?
<!--more-->

The whole reason I started to think about actors was because I was playing around with [Erlang]. Erlang is not the only language to use the Actor Model, of course, but arguably the most popular one. There’s also it’s more modern reincarnation [Elixir], the JVM language [Scala], or the systems programming language [Pony].

It struck me that the Actor Model could work on the web. The more I thought about it, the more it seems like a natural fit.

## The Actor Model

The Actor Model is a mathematical model for concurrent systems in computer science. Or in other words: The Actor Model gives you rules and primitives to handle parallelism. The rules, that are typically enforced by the language, are as follows:

- Everything (non-primitive) is an actor
- An actor has local state (“variables”)
- An actor is a computational entity (“process”) that runs sequentially (“single-threaded”)
- An actor has an address (in the sense of mailbox, not memory)
- An actor can receive messages and react to them by:
  - Mutating its local state
  - Creating new actors
  - Sending messages to other actors asynchronously using their addresses

While each actor runs sequentially, i.e. only one message is processed by an actor at a time, two actors _can_ very well run in parallel.

Now that’s neither a lot of rules nor a lot of tools to have at your disposal, but it’s enough to build incredibly complex systems. Get this: [Erlang], built by Joe Armstrong at Erricson, [is still used today][Erlang story] for extremely scalable and fault-tolerant systems. For example, the backbones of your LTE connection are written in Erlang, and it’s also used for products like WhatsApp or used by companies like Facebook and Amazon.

The interesting thing about the Actor Model is that **it doesn’t need any synchronization primitives like mutexes or semaphores**. No actor can modify another actor’s local state and each actor in itself is single-threaded. Any resource that is required by multiple actors should get its own designated actor that _manages_ access to this resource. All the other actors can request operations to be performed by sending a message to the managing actor.

## … on the web?

The rules outlined above fit the web perfectly. Well, at least if you squint a bit. Allow me to explain:

Let’s ignore the “Everything is an actor” bit (I said squint!!). The main thread’s JavaScript context is the first actor, it is single-threaded, responds to messages in the form of events and has sole access to the DOM and therefore the UI. It’s the managing actor for the DOM. So far, so good. What about additional actors? I think [WebWorkers][WebWorker] fit the role general-purpose actors that can be created by the developer from the main actor (“actors can create other actors”). The new actor’s address is made available to the creating actor in form of a handle that they can use to send messages via `postMessage`. The worker actor can’t access any variables from the main actor and vice versa, but can listen for incoming messages and reply with messages of its own. A worker actor can also create additional actors using `new Worker()`.

Cool? Cool.

## Erlang’s Actors

> **Note:** Dear Erlang friends, while I am by no means an expert in Erlang, I am aware that the code I am listing is neither technically functional nor syntactically correct. I am even misrepresenting the standard library. I am doing this because I do not know how familiar my audience is with Erlang. I do know, however, that they know JavaScript so I am trying to meet them half-way. Please don’t burn me at the stake. Kthxbai.

> **Note:** Dear JavaScript friends, if you are interested in learning _the real_ Erlang, I heartily recommend reading [Learn You Some Erlang], which is a free e-book.

Let’s take a look at some Erlang code as a quick, superficial introduction to Erlang’s syntax and semantics.

### Example 1

I want to do some _incredibly_ expensive mathematical operations like adding and multiplying the numbers 4 and 9. These operations, as we all know, are so expensive that it’s sensible to move them into their own actor to potentially run in a different thread. In the Erlang world, my main program could look like this:

```erlang
main() ->
  Math = spawn(math_worker),
  % Send messages to actor
  Math ! {self(), add, 4, 9},
  Math ! {self(), multiply, 4, 9},
  % Dump all messages received by
  % the main actor to the console
  flush().
```

Assuming you are a JavaScript developer, there’s a couple of things you need to know do understand this program:

- Functions are defined as `function_name(parameters) -> body.`.
- Variables start with an uppercase letter, atoms (similar to symbols) start with a lowercase letter.
- `{...}` is used to construct tuples, which are kind of an immutable Array.
- `!` sends a message (the right-hand side) to an actor’s mailbox (the lefthand side).
- `self()` returns the current actor’s mailbox address.

An actor is just a function. Let’s take a look at the implementation of `math_worker`:

```erlang
math_worker() ->
  receive
    {Sender, add, A, B} -> Sender ! A + B;
    {Sender, multiply, A, B} -> Sender ! A * B
  end,
  math_worker().
```

With `receive` you can wait for the next message to arrive in the current actor’s mailbox and match it against a list of patterns. As we want to be able to handle more than just one message with our math actor, we can use recursion to “loop” and handle more messages.

As you can see, we have to put the sender’s mailbox address into the messages ourselves. Otherwise, our math worker wouldn’t be able to respond with the result.

### Example 2
As a next example I want to read a string from a file. It’s a very simple example, but I like it as it very clearly involves a resources that is not thread-safe:

```erlang
FileHandle = open_file("/myResource.txt"),
Contents = read_from_file(FileHandle),
% ...
```

This is looks incredibly simple, doesn’t it? Synchronous even. But something way more sophisticated is happening under the hood. Things will become clearer if we look at the (pseudo-)implementation of these two functions:

```erlang
open_file(path) ->
  spawn(file_actor).


read_from_file(FileHandle) ->
  FileHandle ! {read},
  receive
    {read_result, Content} -> Content
  end;
```

It turns out that the `FileHandle` we used is actually an actor’s mailbox address! Access to the file itself is managed by an actor. This means that the file handle can be shared and be used my multiple actors (or threads) without more than one actor reading or writing at any given time.

What really blew my mind was the fact that Erlang can run in a cluster where actors are scattered across multiple machines on a network. Mailbox addresses are unique within the cluster and the Erlang runtime takes care of dispatching a message across the network if necessary. So an actor running on one server is capable of _directly_ working with a file on another server without being aware of it.

> **Note:** Is this slow? Maybe. Let’s ignore this concern and continue to work on a conceptual level, shall we?

## The Actor Mindset

Right. Let’s get back to the Web: I think there’s a lot Web developers can learn from the years of experience that Erlang (and now Elixir, Scala and Pony) developers have. It’s probably not a good idea to go full Erlang on the web and try to spawn thousands of actor workers (something that is normal in Erlang). However, the architectural patterns that have evolved over time in the Erlang-esque ecosystem might help us structure our web apps, separate concerns and write more maintainable and potentially scalable code.

Once I had gotten more comfortable with the mindset of an actor model driven environment, I became a bit more skeptical about two recent proposal in Web development:

### DOM-in-Worker

Whenever someone gets introduced to WebWorkers, they will ask sooner or later if they can access the DOM from it. The answer is no. The DOM is not thread-safe and changing that would probably add a good amount of synchronization work at a significant performance cost. Proposals like [DOMChangeList] try to make manipulating the DOM from a Worker context easier. I am not sure anymore if this is desirable.

I think it would be better to see the main thread as the managing actor for the DOM and only expose high-level, semantic operations to workers instead. These high-level operations (like “slide out side-nav” or “show loading spinner”) can be activated by a fairly simple protocol. This kind of architecture is where [Comlink] would thrive.

### Locks on the Web

The [Web Locks API] has been proposed recently and brings what is basically read/write mutexes to the web. As I said at the start of this article: The actor pattern doesn’t use locks. [I couldn't help but wonder][SATC]: would this API be completely superfluous? No and yes.

The actor model doesn’t require any locks as there is no mutable shared memory between actors. In Erlang, you can only send primitives (or tuples of primitives) to other actors and those are copied, not shared. In Pony, you have a capabilities-based type system to avoid sharing mutable memory. On the web, however, we have [SharedArrayBuffer], and its very purpose is to be a chunk of _mutable shared_ memory. To allow synchronizing threads that work on a SAB there’s [Atomics], where you can use `Atomics.wait()` to wait in a blocking fashion for a certain memory address to change its value. `Atomics.wait()` is forbidden on the main thread, as blocking on the main thread would be detrimental.

Additionally, the actor model only works if you can spawn as many actors as required. If you were to give each actor its own WebWorker, even desktop machines would reach their limits.

> **Note:** Firefox’s WebWorkers are currently much cheaper than Chrome’s. There’s a lot of low-hanging fruit that Chromies could reap, but haven’t done so far as WebWorkers are very not popular enough to justify the work necessary.

There’s a couple of libraries (like [actor.js]) out there that bring the actor model to JavaScript and _don’t_ spin up a worker for every actor but put multiple actors on the same thread. I haven’t played around with them, but the support distributing actors across multiple WebWorkers seems to be lacking.

## What are you trying to tell me?

Look at me waffling on and on again. **Here’s the bottom line: Amongst all the architectural models out there, it seems the actor model fits the web more naturally than others. With all the years of experience Erlang (and other) developers have, I wonder if they have useful tips and tricks for us — the web developers — on how to structure our apps. It might help us move more work off the main thread and make our apps more performant, robust and elegant.**

As I said in my [talk at Chrome Dev Summit 2017][WordPress CDS]: We can learn a lot from game developers and the architectures they use. Game developers have to balance their extreme performance demands against their incredibly big teams that all have to work in parallel towards the same goal.

![Image from my CDS talk](gamedev.png)

> **Note:** My colleague [Paul Bakaus] informed that it was in fact [his blog post][pbakaus post] I must have read a while ago.

This attitude does not only work in the context of the game industry, though. Any other industry with strong architectural requirements can be a source of inspiration and knowledge for us and help us write better code on the web. Just try to avoid absolutisms: Just because you now have a hammer called “Actor Model” does not mean everything is a nail.

[Pony]: https://www.ponylang.org/
[Erlang]: http://www.erlang.org/
[Elixir]: http://elixir-lang.github.io/
[Scala]: https://www.scala-lang.org/
[Erlang story]: https://www.ericsson.com/en/news/2014/12/inside-erlang--creator-joe-armstrong-tells-his-story
[WebWorker]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
[Comlink]: https://github.com/GoogleChromeLabs/comlink
[SATC]: https://youtu.be/OaCcm0neDhk
[WordPress CDS]: https://youtu.be/Di7RvMlk9io
[DOMChangeList]: https://github.com/whatwg/dom/issues/270
[Web Locks API]: https://github.com/inexorabletash/web-locks
[Atomics]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics
[actor.js]: https://github.com/nucleartide/actor.js
[Learn You Some Erlang]: http://learnyousomeerlang.com/
[SharedArrayBuffer]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
[pbakaus post]: https://paulbakaus.com/2009/10/06/why-i-would-hire-game-developers-for-my-startup/
[Paul Bakaus]: https://twitter.com/pbakaus/status/946146826440269824
