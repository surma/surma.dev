{
  "title": "DOM2Texture: Abusing Arcane APIs",
  "date": "2017-04-19",
  "socialmediaimage": "title.jpg",
  "live": "false"
}

When using OpenGL (or WebGL), you have to do _everything_ yourself, including font rendering and layouting. I thought: “Wouldn’t it be great if you could just reuse the browser’s layouting and font-rendering engine instead of heaving to reinvent the wheel?”. Yes, but there’s no API for that. *Or is there?*

<!--more-->

> **TL;DR:** You can use `<foreignObject>` to embed normal HTML content in an SVG, encode that SVG as a data URL and draw it to a canvas using `Canvas2DRenderinContext.drawImage()`. You need to inline all the styles, images and other resources as the canvas cannot make any network requests. Check out the [demo] here!

When you want to render strings to screen in OpenGL, it’s not uncommon to use [a texture font and distance field] (https://github.com/libgdx/libgdx/wiki/Distance-field-fonts) to place each individual symbol on a quad. You have to do font sizing and smoothing yourself, you have to calculate the coordinates of each of these queads, when to line wrap and how to handle the baseline. If you want them, you will also need to implement support for ligatures yourself. Most of the time, being able to render text is only a precursor to having a 2D UI within your 3D OpenGL world, so you start implementing layout algorithms too. That seems not only unfun to me, but highly redunant.

As you can tell by the [demo]() (and the presence of a TL;DR), there *is* a way to render DOM elements to a canvas  – if you don’t mind bending over backwards. And once we have something on canvas, we can use it as a texture in WebGL and it would allow us to make use of all the things the browser has already implemented: Loading different fonts, rendering them, coloring them, text shadows, text decorations, weights, RTL, word-wrapping, etc etc etc. But be warned: The TL;DR makes this blog look much shorter than it is.

## Step 1: Foreign Objects

As far as I am ware, [Foreign Objects](https://developer.mozilla.org/en/docs/Web/SVG/Element/foreignObject) are seldomly used. They allow you to include a different XML namespace into an SVG and the SVG renderer will hand of the rendering to the renderer responsible for that namespace. (Danger: This is probably a gross oversimplification.) So by using `<foreignObject>` we can mix SVG graphics with, let’s say, a `<button>` and it will not only render, it will function and be interactive. Amazing!

{{< highlight HTML >}}
<!doctype html>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
  <circle cx="64" cy="64" r="64" style="stroke: blue; fill: none"></circle>
  <foreignObject width=“128" height=“128">
    <button>Ohai</button>
  </foreignObject>
</svg>
{{< /highlight >}}

Foreign objects, just like all other SVG elements, need a size. Think of it as a canvas within a canvas. The dimensions you specify will be used similarly to what the viewport usually is for an HTML document. Since I am trying to generate textures consisting only of a DOM element, I have both the SVG and Foreign Object at the same dimension. If you store the markup above as an HTML file and open it in your browser, you’ll see an SVG circle with a button:

** PICTURE **

## Step 2: Drawing it to canvas

WebGL doesn’t accept SVG objects as textures. It only takes canvases and image elements of raster images. But SVGs are kiiinda images, so there must be a way to do a conversion here, right? Yes, but it’s not as simple as you might expect. Here’s what we have to do:

1.) Serialize our SVG as markup in a string
2.) base64 encode that string to build a [data URI] (these `data:image/png;base64,XXXXX…` things)
3.) Use that data URI as a `src` for a `<img>` element
4.) Draw that `<img>` element to the canvas using [`Canvas2DRenderingContext.drawImage()`]

(I wish we could just give SVGs to [`drawImage()`] – SVGs could be seen as a serialization for canvas drawing instructions, although probably much more powerful than that.)

Let’s take these steps one by one.

### Step 2.1: Serialization

When turning the DOM into a string, most people go and grab [`innerHTML`] on the parent element:

{{< highlight JavaScript >}}
document.querySelector('svg').parentElement.innerHTML

`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
  <circle cx="64" cy="64" r="64" style="stroke: blue; fill: none"></circle>
  <foreignObject width="512" height="512">
    <button>Ohai</button>
  </foreignObject>
</svg>`
{{< /highlight >}}

For most use-cases, that is good enough, but when trying to serialize SVGs with multiple XML namespaces, it’s not. Try it: The button won’t appear if you [load] the above markup as an SVG image. Enter Arcane API #1: [`XMLSerializer`]:

{{< highlight JavaScript >}}
new XMLSerializer().serializeToString(document.querySelector('svg’))
`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
  <circle cx="64" cy="64" r="64" style="stroke: blue; fill: none"/>
  <foreignObject width="512" height="512">
    <button>Ohai</button>
  </foreignObject>
</svg>`
{{< /highlight >}}

As you can see, this serializer took care of adding the XHTML namespace of the children inside the  `<foreignObject>`, and turns it into valid XML by turning `<circle></circle>` into a self-closing tag (i.e. `<circle/>`). And now, [the button shows up].

### Step 2.2: Base64 encoding
#### Step 2.2 Option a: atob
We have our SVG as a string. But for our data URI we need it in base64. Enter Arcane API #2: `atob` and `btoa`. I think these are some of the weirdest (and probably oldest) functions the platform has to offer. They are cryptically named, even after deciphering the names don’t make a lot of sense and their accepted input data isn’t really sufficient nowadays. `btoa` stands for “binary to ascii” and encodes any binary strings (because back in the day, there were no [`ArrayBuffers`] and strings didn’t have to worry about Unicode) into safe ASCII using base64. I don’t know why they didn’t call the function `base64encode()` or anything more sane, but now it’s burnt into the platform. Forever. But apart from that naming disaster: The second you have any code points in your string above the 255 mark, this happens:

** PICTURE **

Aaaah, yes, my old friend [Latin1]. It’s been a while. For our undertaking that means: As long as our document is purely ASCII, we’ll be fine. The second we leave the ASCII range, things will probably stop working. And let’s be honest: We want emoji in our WebGL UIs!

#### Step 2.2 Option b: TextEncoder + base64js
Since the introduction of UTF-8 and [`ArrayBuffer`]s, the platform also offers [`TextEncoder`] and [`TextDecoder`]. We only need the `TextEncoder` as we want to _encode_ a string as a UTF-8 [`Uint8Array`]:

{{< highlight JavaScript >}}
new TextEncoder().encode('Ohai UTF-8 🤡’)
Uint8Array(15) [79, 104, 97, 105, 32, 85, 84, 70, 45, 56, 32, 240, 159, 164, 161]
{{< /highlight >}}

Sadly, `bota` doesn’t handle `ArrayBuffer`, so we need to find another way of base64 encoding an array of bytes. Honestly, I was shocked to find that there’s _nothing_ on the platform – for now I’ll resort to Jameson Little’s [base64js], which poly fills that functionality.
const base64encodedSVG = base64js.fromByteArray(new TextEncoder().encode(serializedXML));

We are almost done. Don’t be alarmed, the last two steps are actually a rather short!

### 2.3: Putting it in an image
{{< highlight JavaScript >}}
const img = document.createElement(‘img’);
img.src = ‘data:image/svg+xml;base64,’ + base64encodedSVG;
img.onload = _ => {
  // Continue here…
}
{{< /highlight >}}

Note the `onload` function we are registering. Images are decoded asynchronously, so if we didn’t put our code in the `unload` handler, it would probably try to use an image that has not have been decoded yet.

### 2.4 Drawing it to canvas
Drawing an image to canvas is surprisingly easy and works the same with any image, even our weird base64-encoded SVG:
{{< highlight JavaScript >}}
const c = document.querySelector('canvas');
const ctx = c.getContext('2d');
ctx.drawImage(img, 0, 0);
{{< /highlight >}}

** PICTURE **

> Note: Don’t mind the blurriness. The blur stems from the fact that I have zoomed in and SVGs handle zooming much better and rasterized images (duh?). Additionally, my canvas is not taking `window.devicePixelRatio` into consideration, which is necessary for Retina displays. Since we are working towards a WebGL texture here, we will be working with fixed dimensions anyways.

We got ourselves a way to render DOM elements to canvas! Hooray. We are done here. Off you go. … except, not quite:

## Step 3: Styles and resources

Thinking I was done, I went ahead and tried using this technique to render some styled text as a texture for a WebGL experiment:

{{< highlight HTML >}}
<style>
  #container {
    width: 100%;
    height: 100%;
    background-color: bisque;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: red;
    font-family: monospace;
  }
</style>
<svg xmlns="http://www.w3.org/2000/svg" width=128 height=128>
  <foreignObject width=128 height=128>
    <div id="container">
      Ohai DOM!
      <img src="uvgrid_small.jpg" width=50>
    </div>
  </foreignObject>
</svg>
{{< /highlight >}}

Turns I didn’t grasp the isolated nature of our SVG in its entirety. Take a look:

** PICTURE **

Not only is all styling gone, but the image is a no-show. What’s going on here? Let’s pick one battle at a time.

### Step 3.1: Styles
Once you think about it, it makes sense that there’s no styling. We are basically creating a separate SVG document (in form of a data URI) and our styling is well outside that document. So let’s make it available by cloning all our styles and moving them into the SVG element.

{{< highlight JavaScript >}}
Array.from(document.querySelectorAll('style'))
  .forEach(styleTag => {
    fo.appendChild(styleTag.cloneNode(true));
  });
{{< /highlight >}}

** PICTURE **

Much better!

>Note: A thing to keep in mind is that some UAs apply different default stylesheets for SVGs than they do for HTML. So if you leave any properties unspecified, these differences in the UA stylsheet can show. Case in point: `font-size` in Safari:

** PICTURE **

Safari’s default font size in an SVG context seems to be much smaller than for HTML. This is easily fixed by explicitly specifying `font-size` in our stylesheet, but it’s yet another bump in the road that is interop.

But let’s talk about the elephant in the room: The image is still missing. What’s up with that?

### Step 3.2: Resources
It turns out that the SVG renderer the [`Canvas2DRenderingContext`] uses has no access to the network.  So while the image element is actually there, it’s just empty as the URL could not be resolved to a resource. But we can do something about this and it involves, you might have guess it, data URIs! As long as the image is either from the same origin or from another origin with CORS headers set, we can take the image element and draw it to a canvas to convert it to a brand new data URI.

{{< highlight JavaScript >}}
function waitForLoad(img) {
  return new Promise(resolve => {
    if(img.complete) resolve(img);
    img.onload = _ => resolve(img);
  });
}
function img2dataURI(img) {
  // Wait for image to be loaded
  return waitForLoad(img)
    .then(img => {
      // Paint it to a canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      // and convert that canvas to a data URI and, once again,
      // wait for it to be decoded and loaded.
      img.src = canvas.toDataURL();
      return waitForLoad(img);
    });
}

const dataUriImages =
  Array.from(document.querySelectorAll('img'))
    .map(imgTag => img2dataURI(imgTag));

Promise.all(dataUriImages)
.then(_ => {
  // remainder of code
});
{{< /highlight >}}

This is probably the biggest chunk of code in this blog post, and yet it doesn’t really introduce any new concepts. We grab all the `<img>` in our document and call `img2dataURI()` on them, which replace the current src of the `<img>` with a data URI encoded version of the original image. The function returns a promise that resolves when all teh work is done.

`img2dataURI()`...

** PICTURE **

Got ’em!

#### What about `<link>` stylesheets?

Now that we know that we don’t have any network access when rendering our SVG, we should also take a look at `<link>` tags that reference stylesheets. In contrast to `<style>` tags we can’t just clone them. The obvious solution is to just `fetch()` the stylesheet and to inline it. But there is another way – time for arcane API #3: `.sheet`. Admittedly, it’s not really arcane, but it’s probably one of the lesser known features: Both `<style>` tags and `<link rel=stylesheet>` tags have `.sheet` property with which you can iterate over parsed versions of all the rules in the stylesheet. So we can just grab all our `<style>` and `<link>` tags and generate one big stylesheet from them:

{{< highlight JavaScript >}}
const styleTag = document.createElement('style');
Array.from(document.querySelectorAll('style, link[rel=stylesheet]'))
  .forEach(linkTag => {
    styleTag.innerText =
      Array.from(linkTag.sheet.cssRules)
        .reduce((str, rule) => str + rule.cssText, '');
  });
svg.appendChild(styleTag);
{{< /highlight >}}

Keep in mind that this approach won’t work if you link to cross-origin stylesheets (like web fonts!).

#### What about `<iframe>`?

Ugh, I thought about this, but then you’d have to not only base64-encode the iframe’d document, but all resources within that document, and it ends up being base64 all the way down. I didn’t want to implement that. It can be done, but I really don’t want to.

## Bonus round: State

We are looking pretty good! We have all we need to solve my original WebGL problem. But here’s an additional tripwire: Every state of the DOM elements that is not reflected to DOM will be lost. So if you have input elements like sliders or text fields you have to do some extra work to make them render in the exact state they were in. For example, you could do the following:

{{< highlight JavaScript >}}
Array.from(svg.querySelectorAll('input'))
  .forEach(inputElem => {
    // Boolean attributes
    ['checked', 'disabled']
      .forEach(attrName => {
        if(inputElem[attrName]) inputElem.setAttribute(attrName, '');
          else inputElem.removeAttribute(attrName, '');
      });
    // Non-boolean attributes
    ['max', 'min', 'placeholder', 'step', 'value']
      .forEach(attrName => {
        inputElem.setAttribute(attrName, inputElem[attrName]);
      });
});
{{< /highlight >}}

** PICTURE **

## Performance

**This approach is not cheap.** The simple markup above takes around 12ms until the image is drawn to the canvas. If you want to use it right now, I’d suggest wrapping the individual steps in `requestIdleCallback()` to make sure the main thread is not blocked. Luckily, there is being work done to make this much, much simpler. ???

## Recap

So there you have it. This is far from perfect and the number of hoops you have to jump through to render some of your own DOM to a canvas is somewhat shocking. It’s cool that it works so I don’t have to reimplement font rendering and layouting for WebGL, but the platform could definitely do better here.
