---json
{
  "title": "Is postMessage slow?",
  "date": "2019-07-04",
  "socialmediaimage": "",
  "live": false
}

---

No. It is not.

<!--more-->

What does “slow” even mean? [I said it before][snakeoil], and I will say it again: If you didn’t measure it, it is not slow, and even if you measures it, the number is pointless without context.

That being said, the fact that people will bring up their concerns about the performance of `postMessage()` every time I mention [Web Workers], means that there is collective understanding that `postMessage()` is bad. [My last blog post][when workers] on workers was [no different][moan], by the way.

Let’s try to figure out where this misconception comes from, put actual numbers to the performance of `postMessage()` and what you can do if after all of this, it is _actually_ still to slow for your _specific_ use-case.

## It’s about sending a message

Please stand back, I am going to use <span class="mirror" data-symbol="☠️">microbenchmarks</span>.

The benchmark will send 1000 messages from a worker to the main thread and measure how long each message takes. The message is randomly generated each time and with a specific breadth and depth.

<section class="carousell">
<div>
  <img src="nokia2-chrome.svg">
</div>
<div>
  <img src="pixel3-chrome.svg">
</div>
<div>
  <img src="imac-chrome.svg">
</div>
<div>
  <img src="imac-firefox.svg">
</div>
<div>
  <img src="imac-safari.svg">
</div>
<div>
  <img src="ipad-safari.svg">
</div>
<div>
  <img src="nokia8110-firefox.svg">
</div>
</section>

---


[Web Workers]: https://developer.mozilla.org/en-US/docs/Web/API/Worker
[moan]: https://twitter.com/dfabu/status/1139567716052930561
[snakeoil]: /things/less-snakeoil/
[when workers]: /things/when-workers/