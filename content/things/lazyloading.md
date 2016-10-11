{
  "title": "Lazyloading",
  "date": "2016-04-08",
  "socialmediaimage": "oldscript.png",
  "live": "true"
}
## Progressive enhancement
At the PWA Roadshow event in London, [Stuart Langridge][Stuart Langridge] [pointed out a mistake][@sil tweet] in my talk. I was showing a piece of code that would lazyload iFrames. If JavaScript was not running, the iFrames would just be empty. Turns out, that is not how you do progressive enhancement!  And as Stuart rightly points out [in his blog post][@sil blog post]: It’s not about people who have JavaScript disabled, but also about people whose browser just forgot to start its JavaScript engine. Yeah, that happens. And apparently, it happens 1% of the time. So how do you do lazyloading, then?

<!--more-->

I came up with a lazyloading mechanism that respects progressive enhancement, which I kinda like. Hence this blogpost.

Lazyloading in this context means that loading certain resources is deferred until the page’s `load` event has fired. This way I know my markup has been parsed and my critical CSS and JS is already running. I am exploiting the `<noscript>` tag to achieve proper progressive enhancement.

{{< highlight HTML >}}
<head>
    <!-- ... -->
    <noscript class="lazyload">
        <link
            rel="stylesheet"
            href="/styles/things.css">
    </noscript>
    <!-- ... -->
</head>
<body>
    <noscript class="lazyload">
        <iframe
            src="https://youtube.com/...">
    </noscript>
</body>
{{< /highlight >}}

`<noscript>` tags will be skipped and end up being invisible and ignored if the browser’s JavaScript engine is running. If the browser does not run JavaScript (whatever the reason), the contents of the tags will be evaluated by the parser. So we have the “no JavaScript scenario” covered.

## The script
The script will progressively enhance the website, if JavaScript *is* enabled. It will query for all `<noscript>` tags that have the `lazyload` class, put their contents through the HTML parser by using `innerHTML` and append the resulting DOM nodes directly before the corresponding `<noscript>` tag.

{{< highlight JS >}}
document.addEventListener('load', _ => {
    const lazyloads =
        document.querySelectorAll('noscript.lazyload');
    // This container is the HTML parser
    const container = document.createElement('div');
    Array.from(lazyloads).forEach(lazyload => {
        const parent = lazyload.parentNode;
        container.innerHTML = lazyload.textContent;
        Array.from(container.children)
            .forEach(n =>
                parent.insertBefore(n, lazyload)
            );
    });
});
{{< /highlight >}}

I like it! If you don’t, let me know why.

[Stuart Langridge]: https://twitter.com/sil
[@sil blog post]: http://www.kryogenix.org/code/browser/why-availability/
[@sil tweet]: https://twitter.com/sil/status/710479150662950912
