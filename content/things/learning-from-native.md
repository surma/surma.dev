{
  "title": "Learning from native: How I build off-thread web apps",
  "date": "2018-02-25",
  "socialmediaimage": "jank.gif",
  "live": "false"
}

I think the UI thread should be for UI work only. But how does one actually do that? Like, with JavaScript? I had an idea, tested it out and want to share the results.

# Inspiration

“[Sync for Reddit](https://play.google.com/store/apps/details?id=com.laurencedawson.reddit_sync)” by Laurence Dawson

> Show video
> Re-record video tho where I open the menu with a button instead of a swipe

# Architecture
## Web Components
Web Components play 2 roles in my apps. One the one hand they are re-usable and self-contained implementations of UI patterns. Looking at “Sync for Reddit”, we can see a two major UI patterns that are used:

1. A stack of “views” that lie on top of each other
1. A side-navigation bar that can be opened with a menu button

As these elements implement UI patterns they are fine to live on the UI thread. Often these elements need to react to user actions within one frame. Delegating that kind of logic to a worker and back will probably lead to a janky experience.

On Android, those kind of UI elements are provided by



are visual elements. As such they are allowed to be on the main thread.


## Worker-centric
If only UI work is allowed on the main thread, where the non-UI work go? In a [worker][WebWorker]! Workers, if used at all, are used as an entity that work is delegated to by the UI thread. I think that mental model doesn’t give workers the credit they deserve — they should be the center of your web app.

If we think about web apps like [actors][Actor model], the UI thread becomes the managing actor for the DOM that is _being orchestrated_ by our main app actor.

To achieve this architecture, you can start rolling your own worker code or use libraries like [Comlink] or, for more convenience, like [Clooney]. In this sample project, I’ll use Clooney.

```html
<!doctype html>
<!-- … other markup … -->
<script>
  (async function () {
    class App {
      constructor() {
        /* … */
      }
      /* … */
    }
    const app = await Clooney.spawn(App);
  })();
```


[WebWorker]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
[Actor model]: https://dassur.ma/things/actormodel/
[Comlink]: https://github.com/GoogleChromeLabs/comlink
[Clooney]: https://github.com/GoogleChromeLabs/clooney
