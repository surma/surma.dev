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

**[Web Workers] can be seen as JavaScript’s take on threads.** JavaScript engines have been built with the assumption that there is a single thread with no concurrent access to underlying memory, which absolves any need for synchronization mechanisms. If regular threads with their shared memory model got added to JavaScript it would be disastrous to say the least. Instead, we have [Web Workers], which are basically an entire JavaScript scope running on a separate thread, without any shared memory or shared values. To make these completely separated and isolated JavaScript scopes work _together_ you have [`postMessage()`][postmessage], which allows you to trigger a `message` event in the other JavaScript scope together with the copy of a value you provide (copied using the [structured clone algorithm][structured clone]).

## The Performance Gap is widening

> **Note:** I hate the “emerging markets” terminology, but to makes this blog post intuitive to as many people as possible, I’ll be using it here.

Phones are getting faster. I don’t think anyone will disagree with that. Stronger GPUs, faster CPUs, more CPUs, more RAM. Phones are going through the same rapid development desktop machines did in the early 2000s. But that’s just one end of the curve. **_Slow_ phones are getting _slower_.** Slow usually implies cheap and a cheaper phone is able penetrate a wider, emerging market. At Google I/O 2019 [Alex Russell] handed out Nokia 2 phones at a partner meeting and encourged them to use it for a week to _really_ get a feel for what a vast number of people use as their daily device. The Nokia 2 sits in an uncanny valley where it looks and feels like a high-quality phone but under the hood it’s more like a smartphone from a decade ago with a browser and an OS from today. Something’s gotta give. Android’s notification bar is janky when you try and pull it down. And that’s without any apps running.

Another trend is feature phones reemerging. You know, the phones that don’t have a touch screen but instead come with a D-Pad and number keys. Yes, these are coming back and run a browser. I have been using the the Nokia 8110, the “Bananaphone”, which runs KaiOS based on Firefox 48. These phones have even weaker hardware but, maybe somewhat surprisingly, their UI doesn’t feel as bad. That’s partly because they have considerably less pixels to drive so, relative to the Nokia 2, they have more power per pixel, if you will.

Bottom line: We are getting faster flagship phones every cycle, but the vast majority of people can’t afford these. The more affordable and accsible phones are not only lagging behind, the get _worse_. **The gap between the fastest and the slowest phone is getting wider.**

## Performance budgets

**Performance budgets are fixed**. Human psychology doesn’t change depending on what device they are holding. If we use [RAIL] guidelines, you have 100ms to react to a user interaction, you have to run animations at 60fps, giving you a frame budget of 16.6ms. If we tie this back to the widening performance gap, it smells like trouble. You can build your app today, do your due diligence and do performance audits, hit all the marks. While the budgets are fixed, the amount of budget a piece of code deducts from that budget depends on the phone, and a slower phone will take _longer_ to complete the same task. **Tomorrow, your app might become unusable on the next-gen low-end phone anymore**. 

That is the burden of the web with its unparalleled reach. You can’t predict what class of device your app will be running on. Even the Nintendo DS had a browser! “Surma, these weird or underpowered devices are not relevant to me/my business!” and you might have a point. A blog post like simply can’t give guidance that applies to everyone, there is always 🌈nuance<span class="flip-h">🌈</span> and context that influence decisions — but it rings awfully familiar to the reaction a lot of people have when confronted with the lack of accessibility on their web app. **I encourage you to _really_ think if you are excluding people by not supporting low-end phones**, it’s a matter of being inclusive and allowing every person to have access to the same information.

## JavaScript is blocking

> **Note:** I’ll be outline my default stance here. None if this is non-negotiable. I adjust my priorities for every project depending on target devices, target audience and overall goals — and so should you!

Maybe it’s worth spelling it out: The bad thing about long-running JavaScript is that it’s blocking. Nothing else can happen while JavaScript is running. The main thread has additional responsibilties to just running a web app’s JavaScript. It also has to do page layout, paint, ship all those pixels to the screen in a timely fashion and look out for user interactions like clicking or scrolling. All of these can’t happen while JavaScript is running. Browsers have shipped some mitigations for this, for example by implementing scrolling on a different thread. In general, however, if you block the main thread, your user will have a bad time.

If you want to experience how that feels, here’s a little script that artifically janks the main thread by occasionally blowing your 16ms frame budget:

```js
setTimeout(function f() {
  const start = performance.now();
  while(performance.now() - start < 300);
  setTimeout(f, Math.random()*100)
}, Math.random()*100);
```

Scrolling and reading a blog might still be pleasantly possible (due to the browser mitigations mentioned above), try selecting some text! To run it, paste this into your browser’s address bar:

```js
javascript:setTimeout(function o(){const e=performance.now();while(performance.now()-e<300);setTimeout(o,Math.random()*100)},Math.random()*100);
```

## Being cooperative

One technique to help with these symptoms is “chunking” your JavaScript or “yielding” to the browser. What this means is that while your JavaScript might take a long time, it can be written with breakpoints at which you are okay with the browser taking control to ship a new frame or to process an input event. Once the browser is done, it will go back to running your code.

Since `async`/`await` implementing this has become fairly easy. Here’s an example we actually shipped in [PROXX]:

It’s important to distinguish: **Blocking JavaScript is only bad on the main thread**, as all the UI works happens on the same thread and has to wait its turn. 


[Web Workers]: https://developer.mozilla.org/en-US/docs/Web/API/Worker
[postmessage]: https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
[structured clone]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
[Alex Russell]: https://twitter.com/slightlylate
[PROXX]: https://proxx.app