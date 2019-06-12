---json
{
  "title": "When should you be using Web Workers?",
  "date": "2019-06-12",
  "socialmediaimage": "social.png",
  "live": false
}

---

Always. You should always use Web Workers. It’s a matter of inclusivity.

<!--more-->

Did I get your attention with that? Good. Of course, as with any topic, there is 🌈nuance<span class="flip-h">🌈</span> and I will lay that all out. But I have opinions, and they are important. Buckle up.

## The Performance Gap is widening

> **Note:** I hate the “emerging markets” terminology, but to makes this blog post intuitive to as many people as possible, I’ll be using it here.

Phones are getting faster. I don’t think anyone will disagree with that. Stronger GPUs, faster and more CPUs, more RAM. Phones are going through the same rapid development desktop machines did in the early 2000s. 

<figure>
  <img src="iphone-scores.svg" alt="A graph showing the always increasing geekbench scores from iPhone 4 to iPhone X">
  <figcaption>Benchmark scores taken from <a href="https://browser.geekbench.com/ios-benchmarks">Geekbench</a>.</figcaption>
</figure>

However, that’s just one edge of the distribution. **_Slow_ phones are stuck in 2014.** Slow often implies cheap and a cheaper phone will reach a wider audience. ~50% of the world are online, meaing that ~50% are not. These people are the next to come online and are predominantly located in emerging markets, where people simply can’t afford any of the [Wealthy Western Web] flagship phones. 

<figure>
  <img src="http://placekitten.com/g/1024/768" alt="A picture of the Nokia 2">
  <figcaption>The Nokia 2</figcaption>
</figure>

At Google I/O 2019 [Alex Russell] handed out Nokia 2 phones at a partner meeting and encourged them to use it for a week to _really_ get a feel for what a many people in the world use as their daily device. The Nokia 2 is weird because it looks and feels like a high-quality phone but under the hood it is more like a smartphone from half a decade ago with a browser and an OS from today — and you can feel that mismatch. 

To make things even more extreme, feature phones are making a comeback. Remember the phones that didn’t have a touch screen but instead come with number keys and a D-Pad? Yeah, those are coming back and they run a browser. I have been using the the Nokia 8110, the “Bananaphone”, which runs KaiOS based on Firefox 48. These phones have even weaker hardware but, maybe somewhat surprisingly, somewhat better performance. That’s partly because they have considerably less pixels to drive. To say it another way: relative to the Nokia 2, they have more power per pixel.

<figure>
  <img src="http://placekitten.com/g/1024/768" alt="A picture of the Nokia 8110">
  <figcaption>The Nokia 8110, or “Banana phone”</figcaption>
</figure>

Bottom line: We are getting faster flagship phones every cycle, but the vast majority of people can’t afford these. The more affordable phones are stuck in the past and have highly fluctuating specs. These low-end phones will mostly likely be used by the massive number of people coming online. **The gap between the fastest and the slowest phone is getting wider, and the median is going _down_.**

## Performance budgets

Chrome’s Web DevRel team advocates for performance budgets that should be set to make sure you app keeps performing over time. Recently, the focus was on file size budgets to guarantee fast loading, but perviously the [RAIL] guidelines were also a hot topic. RAIL is based on human perception and gives you a time-based budget for different tasks. For example, you have ~16ms until the next frame needs to get rendered to make animations feel smooth to the human eye. **These numbers are fixed**, because human psychology doesn’t change depending on what device you are holding. 

Looking at The Widening Performance Gap™️, this spells trouble. You can build your app, do your due diligence and do performance audits, fix all bottlenecks and hit all the marks. **But unless you are developing on the slowest low-end phone available, it is almost impossible to predict how long a piece of code will take on the slowest phone today, let alone the slowest phone tomorrow.**

That is the burden of the web with its unparalleled reach. You can’t predict what class of device your app will be running on. If you say “Surma, these underpowered devices are not relevant to me/my business!”, it strikes me as awfully similar to “People who rely on screenreaders are not relevant to me/my business!”. **It’s a matter of inclusivity. I encourage you to _really_ think if you are excluding people by not supporting low-end phones.** We should strive to allow every person to have access to the world’s information, and your app is part of that, whether you like it or not.

A blog post like this can never give guidance that applies to everyone, because there is always 🌈nuance<span class="flip-h">🌈</span> and context, and this applies to the above statement as well. I won’t pretend that accessibility nor writing for low-end phones is easy. My toys and experiments are often not fully accessible nor do they always use workers. But I do believe that there is a lot of things we can do as a community of tool and framework authors to set people up to do the right thing, to make their work more accessible and more performan by default, which will also make them more inclusive by default.

## JavaScript is blocking

Maybe it’s worth spelling it out: The bad thing about long-running JavaScript is that it’s blocking. Nothing else can happen while JavaScript is running. **The main thread has other responsibilties in addition to running a web app’s JavaScript.** It also has to do page layout, paint, ship all those pixels to the screen in a timely fashion and look out for user interactions like clicking or scrolling. All of these can’t happen while JavaScript is running. 

Browsers have shipped some mitigations for this, for example by moving the scrolling logic to a different thread. In general, however, if you block the main thread, your users will have a bad time. 

### Being cooperative

One technique to avoid blocking is “chunking your JavaScript” or “yielding to the browser”. What this means is adding _breakpoints_ to your code at regular intervals which give the browser a chance to stop running JavaScript and ship a new frame or process an input event. Once the browser is done, it will go back to running your code. The way to yield to the browser on the web platform is to schedule a task, which can be done in a variety of ways. 

> **Required reading:** If you are not familiar with tasks and/or the difference between a task and a microtask, I recommend [Jake Archibald]’s [Event Loop Talk].

In PROXX, we used a `MessageChannel` and use `postMessage()`, as it schedules a task _immediately_. To keep the code readable when adding breakpoints, I strongly recommend using `async`/`await`. Here’s what we actually shipped in [PROXX], where we generate sprites in the background while the user is interacting with the home screen of the game.

```js
const { port1, port2 } = new MessageChannel();
port2.start();

export function task() {
  return new Promise(resolve => {
    const uid = Math.random();
    port2.addEventListener("message", function f(ev) {
      if (ev.data !== uid) {
        return;
      }
      port2.removeEventListener("message", f);
      resolve();
    });
    port1.postMessage(uid);
  });
}

export async function generateTextures() {
  // ...
  for (let frame = 0; frame < numSprites; frame++) {
    drawTexture(frame, ctx);
    await task(); // Breakpoint!
  }
  // ...
}
```

But **chunking still suffers from the influence of The Widening Performance Gap™️**: The time a piece of code takes to reach the next break point is inherently device-dependent. What takes less than 16ms on one low-end phone, might take considerably more time on another low-end phone. 

## Off the main thread

I said before that the main thread has other responsibilities in addition to running a web app’s JavaScript, and that’s the reason why we need to avoid long, blocking JavaScript on the main thread at all costs. But what if we moved most of our JavaScript to a thread that is _dedicated_ to run our JavaScript and nothing else. A thread with no other responsibilities. In such a setting we wouldn’t have to worry about our code being affect by The Widening Performance Gap™️ as the main thread is unaffected and still able to respond to user input and keep the frame rate stable.

### What are Web Workers again?
**[Web Workers], also called “Dedicated Workers”, are JavaScript’s take on threads.** JavaScript engines have been built with the assumption that there is a single thread, and consequently there is no concurrent access JavaScript object memory, which absolves the need for any synchronization mechanism. If regular threads with their shared memory model got added to JavaScript it would be disastrous to say the least. Instead, we have been given [Web Workers], which are basically an entire JavaScript scope running on a separate thread, without any shared memory or shared values. To make these completely separated and isolated JavaScript scopes work together you have [`postMessage()`][postmessage], which allows you to trigger a `message` event in the _other_ JavaScript scope together with the copy of a value you provide (copied using the [structured clone algorithm][structured clone]).

So far, Workers have seen practically no adoption, apart from a few “slam dunk” use-cases, which usually involve long-running number crunching tasks. I think that should change. **We should start using workers. A lot.**

### All the cool kids are doing it
This is not novel idea. At all. Quite the opposite, actually. **Most native platforms strongly encourage to run your code off the main thread (or “UI thread”) and help you to do so**. They have been doing that for a long time, as well. Android has had [`AsyncTask`][AsyncTask] since it’s earliest versions and has added more convenient APIs since then (most recently [Coroutines][coroutines], which can be easily scheduled on different threads). If you opt-in to [“Strict mode”][strict mode], certain APIs (like file operations) will crash your app when used on the UI thread, helping you notice when you are doing non-UI work on the UI thread. 

iOS has had [Grand Central Dispatch][gcd] (“GCD”) from the very start to schedule work on different, system-provided thread pools, including the UI thread. This way they are enforcing both patterns: You always have to chunk your work into tasks so that it can be put in a queue, allowing the UI thread to do UI work whenever necessary, but also allowing you to run non-UI work on a different thread simply by putting the task into a different queue. As a cherry on top, tasks can be assigned a priority which helps to ensure that time-critical work is done as soon as possible without sacrifcing the responsiveness of the system as a whole.

The point is that these native platforms have had support for utilizing non-UI threads since their inception. I think it’s fair to say that, over time, they have proven that this is a Good Idea™️. Keeping work on the UI thread to a minimum helps your app to stay responsive and functional. So why hasn’t this pattern been adopted on the web?

## Developer Experience as a hurdle

Again, the only primitive we have for threading on the web are Web Workers. When you start using Workers with the API they provide, the `message` event handler becomes the center of your universe. That doesn’t feel great. Additionally, Workers are _like_ threads, but they are not the same as threads. You can’t have multiple threads access the same variable (like a state object) as everything needs to go via messages and these messages can carry many but not all JavaScript values (most notably: you can’t send an `Event`, or any class instances without data loss). This, I think, has been a major deterrant for developers.

### Comlink
For this exact reason I wrote [Comlink], which not only hides `postMessage()` from you, but also the fact that you are working with Workers in the first place. It _feels_ like you have shared access to variables from other threads:

```js
// main.js
import * as Comlink from "https://unpkg.com/comlink?module";

const worker = new Worker("worker.js");
const State = await Comlink.wrap(worker);
// This `state` variable actually lives in the worker!
const state = new State();
await state.inc();
console.log(await state.currentCount);
```

```js
// worker.js
import * as Comlink from "https://unpkg.com/comlink?module";

class State {
  constructor() {
    this.currentCount = 0;
  }

  inc() {
    this.currentCount++;
  }
}

Comlink.expose(State);
```

> **Note:** I’m using top-level await and modules-in-workers here to keep the sample short. See [Comlink’s repository][Comlink] for real-life examples and more details.

Comlink is not the only solution in this problem space, it’s just the one I’m most familiar with (unsurprising, considering that I wrote it 🙄). If you want to look at some different approaches, take a look at [Andrea Giammarchi’s][webreflection] [workway] or [Jason Miller’s][developit] [workerize].

Personally, I don’t care which library you use, as long as you end up switching to an off-main-thread architecture. We have used Comlink to great success in both [PROXX] and [Squoosh], as it is small (1.2KiB gzip’d) and allowed us to use many of the common patterns from languages with “real” threads without notable development overhead.

### Actors
I evaluated another approach recently together with [Paul Lewis]. Instead of hiding the fact that you are using Workers and `postMessage`, we went back to the 70s and used [the Actor Model][actor model], an architecture that _embraces_ message passing as its fundamental building block. Out of that thought experiment, we built a [support library for actors][actor-helpers], a [starter kit][actor-boilerplate] and gave [a talk][cds actors] at Chrome Dev Summit 2018, explaining the architecture and its implications.

## “Benchmarking”
Some people are probably wondering: **is it worth the effort to adopt an off-main-thread architecture?** Especially with a library like [Comlink], the barrier to adopt an off-main-thread architecture should be significantly lower than before. More strikingly, looking at how _consistently_ off-main-thread is part of the core architecture on native platforms makes it seem weird that the web has not seen a lot of movement in this area. Maybe the web is fundamentally different?

[Dion Almaer] asked me to write a version of [PROXX] where everything runs on the main thread, probably to clear up that very question. And so [I did][proxx omt]. The difference is _not_ night and day. On a Pixel 3 or a MacBook, both versions feel the same. Running a trace on the Nokia 2, however, shows where off-the-main thread does make a difference. Especially with respect to The Widening Performance Gap™️, it increases resilience against unexpectedly large or long tasks. **With everything on the main thread, our tap handler takes ~270ms, _way_ over our budget of 16ms** to ensure that our WebGL animations continue to run smoothly. And there are less powerful devices in circulation.

<figure>
  <img src="http://placekitten.com/g/1024/768" alt="2 traces of the Nokia 2 showing the difference in event processing duration.">
  <figcaption>Left: Tap event handler when everything runs on the main thread taking 270ms. Right: Tap event handler when the Comlink-based off-main-thread architecture is used taking 2ms.</figcaption>
</figure>

Keep in mind that the work doesn’t just disappear. The code still took ~270ms to run, but it is now happening in a different thread. Keeping the event handlers lean by only using them to kick off work in a worker ensured that the UI thread stays as free as possible, even on the slowest of devices. 

## Conclusion

Web Workers help your app run on a wider range of devices. Libraries like [Comlink] help you utilize workers without losing convenience and development velocity and allow you to build an intuitive architecture that spans multiple threads. My goal is that in every non-toy project you will use a worker for your non-UI work. **If you find it too hard, the web platform or the ecosystem need to fix that** and you need to let me know where you are struggling.

---

Special thanks to [Jose Alcérreca][ppvi] and [Mortiz Lang][slashmodev] for helping me understand how native platforms are handling this problem space.

[Web Workers]: https://developer.mozilla.org/en-US/docs/Web/API/Worker
[postmessage]: https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
[structured clone]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
[Alex Russell]: https://twitter.com/slightlylate
[PROXX]: https://proxx.app
[setimmediate]: https://developer.mozilla.org/en-US/docs/Web/API/Window/setImmediate
[Jake Archibald]: https://twitter.com/jaffathecake
[Event Loop Talk]: https://www.youtube.com/watch?v=cCOL7MC4Pl0
[ppvi]: https://twitter.com/ppvi
[slashmodev]: https://twitter.com/slashmodev
[AsyncTask]: https://developer.android.com/reference/android/os/AsyncTask
[coroutines]: https://kotlinlang.org/docs/reference/coroutines/basics.html
[gcd]: https://developer.apple.com/documentation/dispatch
[strict mode]: https://developer.android.com/reference/android/os/StrictMode
[Comlink]: https://github.com/GoogleChromeLabs/comlink
[Squoosh]: https://squoosh.app
[actor-helpers]: https://github.com/PolymerLabs/actor-helpers
[actor-boilerplate]: https://github.com/PolymerLabs/actor-boilerplate
[cds actors]: https://www.youtube.com/watch?v=Vg60lf92EkM
[Dion Almaer]: https://twitter.com/dalmaer
[webreflection]: https://twitter.com/webreflection
[workway]: https://github.com/WebReflection/workway
[developit]: https://twitter.com/_developit
[workerize]: https://github.com/developit/workerize
[wealthy western web]: https://www.smashingmagazine.com/2017/03/world-wide-web-not-wealthy-western-web-part-1/
[actor model]: https://dassur.ma/things/actormodel/
[proxx omt]: https://github.com/GoogleChromeLabs/proxx/pull/437
[RAIL]: https://developers.google.com/web/fundamentals/performance/rail
[Paul Lewis]: https://twitter.com/aerotwist