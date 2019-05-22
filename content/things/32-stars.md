---json
{
  "title": "Chromium Bug Tracker: All bugs with >32 stars get fixed?",
  "date": "2017-02-13",
  "socialmediaimage": "tomdale.jpg"
}
---

Ah, [Betteridge's law of headlines](https://en.wikipedia.org/wiki/Betteridge%27s_law_of_headlines) strikes again. The answer to the headline is “No”. Sorry.

<!--more-->

During BlinkOn 7 I made this – admittedly oversimplified – tweet:

<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">Blink is committing to resolving all bugs within a year if it has more than 32 stars on the tracker. <a href="https://twitter.com/hashtag/blinkon?src=hash">#blinkon</a></p>&mdash; Das Surma (@DasSurma) <a href="https://twitter.com/DasSurma/status/826504065555116032">January 31, 2017</a></blockquote>

The tweet got some traction and as human nature dictates, people immediately started to game the system:

<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">You know what to do fam. <a href="https://twitter.com/hashtag/VoteEmUp?src=hash">#VoteEmUp</a> <a href="https://t.co/E9SIYp8tHw">https://t.co/E9SIYp8tHw</a></p>&mdash; Tom Dale (@tomdale) <a href="https://twitter.com/tomdale/status/826957774743494656">February 2, 2017</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

Shockingly, this not what we had in mind. So what did we want to achieve with this commitment?

As [Rick Byers](https://twitter.com/RickByers) said in his talk at BlinkOn: **We are on a mission to reduce developer pain.** Predictability (including interoperability) are one of the major sources of pain for developers on the platform, so we want issues related to these fields to be fixed sooner rather than later. So how do we know what issues are currently causing the most pain to developers? This is where the stars come into play!

**Stars seem like a good indicator to reflect interests of external developers.** People star an issue when they are missing a feature that they need to build Their Thing™ or when hitting a wall while debugging a problem. The Chrome team has always used stars as a way to help prioritize all the open issues they have on [Chromium’s issue tracker crbug.com](https://bugs.chromium.org/p/chromium/issues/list) (at the time of writing there are over 52k open issues). But now the web platform team is making more of a concerted effort to review the top-starred issues (see also [Rick’s & Robert’s talk](https://www.youtube.com/watch?v=meAl-s77DuA&feature=youtu.be&t=9m47s) at CDS 2016). The idea is that resolving issues with a lot of stars has a high correlation with making developer’s daily work easier.

The number 32 is merely a statistical artifact. It has been chosen to segment the top 1% (~120) of [open web platform bugs](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3Ablink+stars%3E32&sort=-stars+opened&groupby=&colspec=ID+Pri+Stars+Component+Status+Summary+Modified+Opened+&nobtn=Update). That is a reasonable workload for a year, but consider that we will also move Chrome forward with other features at the same time. We will have to close 1 bugs every two workdays to hit the mark. Considering the size of Chrome’s engineering team, this is possible. However, if people start gaming this metric by – let’s say – writing bots for starring their personal favorite issues, I am pretty sure the number will be adjust accordingly. **Stars are only one of many signals** that can reflect where developers’ interests lie, but we think it’s the best one currently available.

So keep starring like you did before. You want something? Star it. These are signals to the Chrome engineering team about the priorities of the outside world – issues with more stars are more likely to get attention sooner. That’s all there is to it.
