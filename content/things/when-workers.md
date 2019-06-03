---json
{
"title": "When should you be using Web Workers?",
"date": "2019-05-30",
"socialmediaimage": "social.png"
}

---

Always. You should always use Web Workers. It’s a matter of inclusivity.

<!--more-->

Did I get your attention with that? Good. Of course, as with any topic, there is 🌈nuance<span class="flip-h">🌈</span> and I will lay that all out. But I have opinions, and they are important. Buckle up.

## What are workers, again?

**The TL;DR on [Web Workers] is that they are JavaScript’s take on threads.** JavaScript engines have been built with the assumption that there is a single thread, and consequently there is no concurrent access JavaScript object memory, which absolves the need for any synchronization mechanism. If regular threads with their shared memory model got added to JavaScript it would be disastrous to say the least. Instead, we have been given [Web Workers], which are basically an entire JavaScript scope running on a separate thread, without any shared memory or shared values. To make these completely separated and isolated JavaScript scopes work _together_ you have access to [`postMessage()`][postmessage], which allows you to trigger a `message` event in the _other_ JavaScript scope together with the copy of a value you provide (copied using the [structured clone algorithm][structured clone]).

So far, Workers have seen practically no adoption, apart from a few “slam dunk” use-cases, which usually involve long-running number crunching tasks. I think that should change. **We should start using workers.**

## The Performance Gap is widening

> **Note:** I hate the “emerging markets” terminology, but to makes this blog post intuitive to as many people as possible, I’ll be using it here.

Phones are getting faster. I don’t think anyone will disagree with that. Stronger GPUs, faster and more CPUs, more RAM. Phones are going through the same rapid development desktop machines did in the early 2000s. However, that’s just one edge of the distribution. **_Slow_ phones are getting _slower_.** Slow often implies cheap and a cheaper phone will reach a wider audience, especially in emerging markets. At Google I/O 2019 [Alex Russell] handed out Nokia 2 phones at a partner meeting and encourged them to use it for a week to _really_ get a feel for what a huge number of people in the world use as their daily device. The Nokia 2 is weird because it looks and feels like a high-quality phone but under the hood it is more like a smartphone from a decade ago with a browser and an OS from today — and it shows. Android’s notification bar is janky when you try and pull it down. Without any apps running. On a fresh installation.

An additional trend is feature phones coming back into circulation again. You know, the phones that don’t have a touch screen but instead come with a D-Pad and number keys. Yes, these are coming back and run a browser. I have been using the the Nokia 8110, the “Bananaphone”, which runs KaiOS based on Firefox 48. These phones have even weaker hardware but, maybe somewhat surprisingly, perform less bade. That’s partly because they have considerably less pixels to drive so, relative to the Nokia 2, they have more power per pixel, if you will.

Bottom line: We are getting faster flagship phones every cycle, but the vast majority of people can’t afford these. The more affordable and accsible phones are not only lagging behind, the get _worse_. **The gap between the fastest and the slowest phone is getting wider, and the median is going _down_.**

## Performance budgets

We often advocate for performance budgets that should be set to make sure you app keeps performing over time. One example ar the [RAIL] guidelines that are based on human perception and give you a time-based budget for different tasks.  For example, you have 100ms to react to a user interaction according to this model. **These numbers are fixed**, because human psychology doesn’t change depending on what device you are holding. 

Looking at the widening performance gap, this spells trouble. You can build your app today, do your due diligence and do performance audits, hit all the marks. The next low-end phone might take _longer_ to complete the same task. **Tomorrow, your app might become unusable on the next-gen low-end phone anymore**. 

That is the burden of the web with its unparalleled reach. You can’t predict what class of device your app will be running on. If you say “Surma, these underpowered devices are not relevant to me/my business!”, it is awfully similar to “People with impaired vision are not relevant to me/my business!”. **It’s a matter of inclusivity. I encourage you to _really_ think if you are excluding people by not supporting low-end phones.** We should strive to allow every person to have access to the same information.

A blog post like this can never give guidance that applies to everyone, because there is always 🌈nuance<span class="flip-h">🌈</span> and context, and this applies to the paragraph above as well. I won’t pretend that accessibility nor writing for low-end phones is easy. But I do believe that there is a lot of things we can do as a community of tool and framework authors to set people up the right way, to make their work more accessible and more performant apps by default, which will also make them more inclusive by default.

## JavaScript is blocking

Maybe it’s worth spelling it out: The bad thing about long-running JavaScript is that it’s blocking. Nothing else can happen while JavaScript is running. The main thread has additional responsibilties to just running a web app’s JavaScript. It also has to do page layout, paint, ship all those pixels to the screen in a timely fashion and look out for user interactions like clicking or scrolling. All of these can’t happen while JavaScript is running. 

Browsers have shipped some mitigations for this, for example by implementing scrolling on a different thread. In general, however, if you block the main thread, your user will have a bad time. 

> **Pro tip:** Conversely, **blocking JavaScript is only bad on the main thread**. Blocking a different thread, like a Worker, is far less detrimental to the perceived quality of your app. 

## Being cooperative

One technique to avoid blocking is “chunking your JavaScript” or “yielding to the browser”. What this means is writing JavaScript with _breakpoints_ which give the browser a chance to take control to ship a new frame or to process an input event. Once the browser is done, it will go back to running your code. The way to yield to the browser on the web platform is to schedule a task, which can be done in a variety of ways. Often I find people using `setTimeout` to create tasks, but the problem here is that browser clamp the timeout to a _minimun_ of 4ms. That’s why I often create a `MessageChannel` and use `postMessage()`, as it schedules a task _immediately_. If you are not familiar with tasks and/or the difference between a task and a microtask, I recommend [Jake Archibald]’s [Event Loop Talk].

Code can be kept quite readable despite the breakpoints by using `async`/`await`. Here’s what we actually shipped in [PROXX], where we generate sprites in the background while the user is interacting with the home screen of the game. Any blockage of the main thread here would make the app appear janky or laggy.

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

for (let frame = 0; frame < numSprites; frame++) {
  drawTexture(frame, ctx);
  await task(); // Breakpoint!
}
```

One thing I want to emphasize:


[Web Workers]: https://developer.mozilla.org/en-US/docs/Web/API/Worker
[postmessage]: https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
[structured clone]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
[Alex Russell]: https://twitter.com/slightlylate
[PROXX]: https://proxx.app
[setimmediate]: https://developer.mozilla.org/en-US/docs/Web/API/Window/setImmediate
[Jake Archibald]: https://twitter.com/jaffathecake
[Event Loop Talk]: https://www.youtube.com/watch?v=cCOL7MC4Pl0