---
title: "Ditherpunk — The article I wish I had about monochrome image dithering"
date: "2020-12-15"
socialmediaimage: "social.png"
live: false
---

I always loved the visual aesthetic of dithering but never knew how it works exactly. This article may contain traces of nostaliga and none of Lenna.

<!-- more -->

## How did I get here? (You can skip this)

<style>
  .pixelated {
    image-rendering: pixelated;
  }

  .demoimage {
    max-width: 400px !important;
    max-height: 400px !important;
    width: auto;
    height: auto;
    object-fit: contain;
  }
</style>

I am late to the party, but I finally played [“Return of the Obra Dinn”][Obra Dinn], the most recent game by [Lucas Pope][dukope] of [“Papers Please”][Papers Please] fame. Obra Dinn is a story puzzler that I can only recommend. But what really struck me is that is a 3D game (using the [Unity game engine][Unity]) but rendered using only 2 colors with dithering. Apparently, this has been dubbed “Ditherpunk”, and I love that.

<figure>
  <img loading="lazy" width="1134" height="499" src="./obradinn.png" class="pixelated">
  <figcaption>Screenshot of “Return of the Obra Dinn”.</figcaption>
</figure>

The fact that I have never seen a 3D game with dithering like this probably stems from the fact that color palettes are mostly a thing of the past. You _may_ remember running Windows 95 with 16 colors or playing games like “Monkey Island” on it.

<section class="carousel">
  <figure>
    <img loading="lazy" width="640" height="480" src="./win95.png">
    <figcaption>Windows 95 configured to use 16 colors. Now spend hours trying to find the right floppy disk with the drivers to get the “256 colors” or, <em>gasp</em>, “True Color” show up.</figcaption>
  </figure>
  <figure>
    <img loading="lazy" width="640" height="400" src="./monkeyisland16.png" class="pixelated">
    <figcaption>Screenshot of “The Secret of Monkey Island” using 16 colors.</figcaption>
  </figure>
</section>

For a long time now, however, we have had 8 bits per channel per pixel, allowing each pixel on your screen to assume one of 16 million colors. With HDR and wide gamut on the horizon, things are moving even further away to ever requiring any form of dithering. _But I like the way it looks,_ and Obra Dinn rekindled that love for me. Knowing a tiny bit about dithering from my work on [Squoosh], I was especially impressed with Obra Dinn’s ability to keep the dithering stable while I moved and rotated the camera through 3D space.

> **Note**: As it turns out, Lucas Pope put extensive work into finding a way to make his dithering visually stable. He wrote about his attempts in a [forum blog post][dukope dithering], which features some of the dithering techniques in this article.

## Dithering
### What is Dithering?

According to Wikipedia, “Dither is an intentionally applied form of noise used to randomize quantization error”, and is a technique not only limited to images. It is actually a technique used to this day on audio recordings, but that is a rabbit hole to fall into another time. Let’s dissect this in the context of images.

### Quantization 

<figure>
  <img loading="lazy" width="400" height="267" src="./dark-original.png" class="pixelated demoimage">
  <figcaption>Example image #1: A black-and-white photograph of San Francisco’s Golden Gate Bridge, downscaled to 400x267 (<a href="./dark-hires.jpg" target="_blank">higher resolution</a>).</figcaption>
</figure>

<figure>
  <img loading="lazy" width="253" height="400" src="./light-original.png" class="pixelated demoimage">
  <figcaption>Example image #2: A black-and-white photograph of San Francisco’s Bay Bridge, downscaled to 253x400 (<a href="./light-hires.jpg" target="_blank">higher resolution</a>).</figcaption>
</figure>

Both black-and-white photos use 256 different shades of gray. If we wanted to use fewer colors — for example just black and white to achieve monochromaticity — we have to change the pixels that are not already black or white. In this scenario, the colors black and white are called our “color palette” and the process of changing pixels that do not use a color from the palette is called “quantization”. Because not all colors from the original images are in the color palette, this will inevitably introduce an error called the “quantization error”. 

> **Note**: The code samples in this article are real but built on top of a helper class `GrayImageF32N0F8` I wrote for the [demo] of this article. It’s similar to the web’s [`ImageData`][ImageData], but uses `Float32Array`, only has one color channel, represents values between 0.0 and 1.0 and has a whole bunch of helper functions. The source code is available in [the lab][lab].

A straight forward way to quantize an image with a given color palette is to find the closest color in the palette. In our scenario, we can look at the brightness of every pixel. A brightness of 0 means black, a brightness of 1 means white, everything else is in-between, ideally correlating with human perception such that a brightness of 0.5 is a nice mid-gray. 

### Gamma

I had finished writing this article and just wanted to “quickly” look what a black-to-white gradient looks like with the different dithering algorithms. The results showed me that I had forgotten the thing that _always_ somehow becomes a problem when working with images: color spaces. The sentence “ideally correlating with human perception” from the previous paragraph carries a lot of meaning once you realize that color spaces are involved.

My [demo] is implemented using web technologies, most notably `<canvas>` and `ImageData`, which are — at the time of writing — specified to use [sRGB]. It’s an old color space specification (from 1996) whose brightness response was modeled along the behavior for CRTs. While barely anyone uses CRTs these days, it’s still considered the color space that is safe to be assumed to be correctly displayed on every display. As such, it is the default on the web platform. However, sRGB is not linear, meaning  that in sRGB $(0.5, 0.5, 0.5)$ is _not_ the color a human sees when you mix 50% of $(0, 0, 0)$ and $(1, 1, 1)$. 

<figure>
  <img loading="lazy" width="360" height="40" src="./gradient-srgb.png" class="pixelated">
  <figcaption>A gradient and how it looks when dithered in sRGB color space.</figcaption>
</figure>

As this image shows, the dithered gradient becomes bright way too quickly. If we want 0.5 be the color in the middle of pure black and white (as perceived by a human), we need to convert from sRGB to linear RGB space, which is also called “gamma correction”. Wikipedia lists the following formulas to convert between sRGB and linear RGB.

$$
\begin{array}{rcl}
\text{srgbToLinear}(b) & = & \left\{\begin{array}{ll}
  \frac{b}{12.92} & b \le 0.04045 \\
  \left( \frac{b + 0.055}{1.055}\right)^{\gamma} & \text{otherwise}
\end{array}\right.\\

\text{linearToSrgb}(b) & = & \left\{\begin{array}{ll}
  12.92\cdot b & b \le 0.0031308 \\
   1.055 \cdot b^\frac{1}{\gamma} - 0.055 & \text{otherwise}
\end{array}\right.\\
\text{with}\space\gamma = 2.4
\end{array}\\
$$

With these conversions in place, dithering produces (more) accurate results:

<figure>
  <img loading="lazy" width="360" height="40" src="./gradient-linear.png" class="pixelated">
  <figcaption>A gradient and how it looks when dithered in linear RGB color space.</figcaption>
</figure>

### Quantization (cont’d)
To quantize a given color, we only need to check if the color’s brightness is greater or less than 0.5 and quantize to white and black respectively. Applying this quantization to the image above yields an... unsatisfying result.

```js
grayscaleImage.mapSelf(brightness => 
  brightness > 0.5 ? 1.0 : 0.0
);
```

<figure>
  <section class="carousel">
    <img loading="lazy" width="400" height="267" src="./dark-quantized.png" class="pixelated demoimage">
    <img loading="lazy" width="253" height="400" src="./light-quantized.png" class="pixelated demoimage">
  </section>
  <figcaption>Each pixel has been quantized to the either black or white depending on its brightness.</figcaption>
</figure>

### Random noise

Back to Wikipedia’s definition of dithering: “Intentionally applied form of noise used to randomize quantization error”. Instead of quantizing each pixel directly, we add noise with a value between -0.5 and 0.5 to each pixel. The idea is that some pixels will now be quantized to the “wrong” color, but how often that happens depends on the pixel’s original brightness. Black will _always_ remain black, white will _always_ remain white, a mid-gray will be black only roughly 50% of the time. The average brightness of an area in the quantized image should be close to the average brightness of the same area in the original image. Statistically, the overall quantization error is reduced and our brains are quite eager to do the rest and help you see the, uh, big picture.

```js
grayscaleImage.mapSelf(brightness => 
  (brightness + Math.random() - 0.5) > 0.5 
    ? 1.0 
    : 0.0
);
```

<figure>
  <section class="carousel">
    <img loading="lazy" width="400" height="267" src="./dark-random.png" class="pixelated demoimage">
    <img loading="lazy" width="253" height="400" src="./light-random.png" class="pixelated demoimage">
  </section>
  <figcaption>Random noise [-0.5; 0.5] has been added to each pixel before quantization.</figcaption>
</figure>

I found this quite surprising! It is by no means _good_ — video games from the 80s have shown us that we can do better — but this is a very low effort and quick way to get more detail into a monochrome image. And if I was to take “dithering” literally, I’d end my article here. But there’s more…

## Ordered Dithering

Instead of talking about what kind of noise to add to an image before quantizing it, we can also change our perspective and talk about adjusting the quantization threshold.

```js
// Adding noise
grayscaleImage.mapSelf(brightness => 
  (brightness + Math.random() - 0.5) > 0.5 
    ? 1.0 
    : 0.0
);

// Adjusting the threshold
grayscaleImage.mapSelf(brightness => 
  brightness > Math.random() 
    ? 1.0 
    : 0.0
);
```

In the context of monochrome dithering, where the quantization threshold is 0.5, these two approaches are equivalent:

<figure>

$$
\begin{array}
{} & \mathrm{brightness} + \mathrm{rand}() - 0.5 & > & 0.5 \\
\Leftrightarrow &
\mathrm{brightness} & > & 1.0 - \mathrm{rand}() \\
\Leftrightarrow & \mathrm{brightness} &>& \mathrm{rand}()
\end{array}
$$

</figure>

The upside of this approach is that we can talk about a “threshold maps”. These maps can make it easier to reason about why a resulting image looks the way it does by visualizing the threshold map itself. Threshold maps can also be precomputed and reused, which makes the dithering process parallelizable per pixel and as a result can be run as a shader on the GPU. This is what Obra Dinn does! There are a couple of different ways to generate these threshold maps, but all of them introduce some kind of order to the noise that is added to the image, hence the name “ordered dithering”.

The threshold map for our random noise is also called “white noise”. The name comes from a term in signal processing where every frequency has the same intensity, just like in white light.

<figure>
  <img loading="lazy" width="400" height="267" src="./whitenoise.png" class="pixelated demoimage">
  <figcaption>The threshold map for O.G. dithering is, by definition, white noise.</figcaption>
</figure>

### Bayer Dithering

“Bayer dithering” uses a Bayer matrix as the threshold map. They are named after Bruce Bayer, inventor of the [Bayer filter], which is in use to this day in digital cameras to give brightness sensors the ability to take color images by cleverly arranging colored filters in front of the individual pixel sensors. That same pattern is used in the Bayer dithering threshold map and might look familiar to some of you.

Bayer matrices come in various sizes (which I ended up calling “levels”). Bayer Level 0 is $2 \times 2$ matrix. Bayer Level 1 is a $4 
\times 4$ matrix. Bayer Level $n$ is a $2^{n+1} \times 2^{n+1}$ matrix. A level $n$ can be recursively generated from level $n-1$ (although Wikipedia also lists an [per-cell algorithm][Bayer wikipedia]) and if your image happens to be bigger than your threshold map, you can tile the threshold map. 

<figure>

$$
\begin{array}{rcl}
  \text{Bayer}(0) & 
  = & 
  \left( 
    \begin{array}{cc} 
      0 & 2 \\ 
      3 & 1 \\
    \end{array}
  \right) \\
\end{array} 
$$

$$
\begin{array}{c}
  \text{Bayer}(n) = \\
  \left(
    \begin{array}{cc} 
      4 \cdot \text{Bayer}(n-1) + 0 & 4 \cdot \text{Bayer}(n-1) + 2 \\ 
      4 \cdot \text{Bayer}(n-1) + 3 & 4 \cdot \text{Bayer}(n-1) + 1 \\
    \end{array}
  \right)
\end{array}
$$

<figcaption>Recursive definition of Bayer matrices.</figcaption>
</figure>

A level $n$ Bayer matrix contains the numbers $0$ to $2^{2n+2}$. To use them as a threshold map, you need to normalize them, i.e. divide by $2^{2n+2}$. 

```js
const bayer = generateBayerLevel(level);
grayscaleImage.mapSelf((brightness, {x, y}) => 
  brightness > bayer.valueAt(x, y, {wrap: true}) 
    ? 1.0 
    : 0.0
);
```

One thing to note is that the Bayer matrices as defined above will render an image lighter than it originally was. The lower the Bayer level used, the higher the error is. 

<figure>
  <img loading="lazy" width="400" height="267" src="./bayerbias.png" class="pixelated demoimage">
  <figcaption>Bayer Dithering Level 0.</figcaption>
</figure>

For example at level 0, one out of four pixels would render white for any brightness value > 1/255 = 0.004. In our dark test image, the sky is not pure black and is dithered in a very unpleasing and distorting way using Bayer Level 0. Alternatively, we can flip the bias and make images render _darker_ by inverting the way we use the Bayer matrix:

```js
const bayer = generateBayerLevel(level);
grayscaleImage.mapSelf((brightness, {x, y}) => 
  brightness > 1 - bayer.valueAt(x, y, {wrap: true}) 
    ? 1.0 
    : 0.0
);
```

I have used the original Bayer definition for the light image and the inverted version for the dark image. I personally found Level 1 and 3 the most aesthetically pleasing. 

<figure>
  <section class="carousel">
    <img loading="lazy" width="400" height="267" src="./dark-bayer0.png" class="pixelated demoimage">
    <img loading="lazy" width="253" height="400" src="./light-bayer0.png" class="pixelated demoimage">
  </section>
    <figcaption>Bayer Dithering Level 0.</figcaption>
  </figure>
  <figure>
  <section class="carousel">
    <img loading="lazy" width="400" height="267" src="./dark-bayer1.png" class="pixelated demoimage">
    <img loading="lazy" width="253" height="400" src="./light-bayer1.png" class="pixelated demoimage">
  </section>
    <figcaption>Bayer Dithering Level 1.</figcaption>
  </figure>
  <figure>
  <section class="carousel">
    <img loading="lazy" width="400" height="267" src="./dark-bayer2.png" class="pixelated demoimage">
    <img loading="lazy" width="253" height="400" src="./light-bayer2.png" class="pixelated demoimage">
  </section>
    <figcaption>Bayer Dithering Level 2.</figcaption>
  </figure>
  <figure>
  <section class="carousel">
    <img loading="lazy" width="400" height="267" src="./dark-bayer3.png" class="pixelated demoimage">
    <img loading="lazy" width="253" height="400" src="./light-bayer3.png" class="pixelated demoimage">
  </section>
    <figcaption>Bayer Dithering Level 3.</figcaption>
  </figure>

### Blue noise

Both white noise and Bayer dithering have drawbacks, of course. Bayer dithering, for example, is very structured and will look quite repetitive, especially at lower levels. White noise is random, meaning that there will be clusters of bright pixels and voids of darker pixels. This can be made more obvious by squinting or, if that is too much work for you, through blurring the threshold map algorithmically. These clusters and voids are affecting the output of the dithering process as well, as details in darker areas will not get accurately represented if they fall into one of the cluster or brighter areas fall into a void.

<figure>
  <img loading="lazy" width="256" height="128" src="./whitenoiseblur.png" class="pixelated">
  <figcaption>Clear clusters and voids remain visible even after applying a Gaussian blur (σ = 1.5).</figcaption>
</figure>

A source of noise that tries to address this is labelled _blue_ noise, because the higher frequencies (like blue light) have higher intensities compared to the lower frequencies. By removing or dampening the lower frequencies, cluster and voids become less pronounced and the threshold map gives a more even visual. Blue noise dithering is just as fast to apply to an image as white noise dithering — it’s just a threshold map in the end — but _generating_ blue noise is a bit harder and expensive. 

The most common algorithm to generate blue noise seems to be the “void-and-cluster method” by [Robert Ulichney]. Here is the [original whitepaper][bluenoise93]. I found the way the algorithm is described quite unintuitive and, now that I have implemented it, I am convinced it is unnecessarily abstract. 

The algorithm is based on the idea that you can detect a pixel that is part of cluster or a void by applying a [Gaussian Blur] to the image and finding the brightest (or darkest) pixel in the blurred image respectively. After initializing a black image with a couple of random white pixels, the algorihtm proceeds to continuously swap cluster pixels and void pixels to spread the white pixels out as evenly as possible. Afterwards, every pixel gets a number between 0 and n (where n is the total number of pixels) according to their importance for forming clusters and voids. For more details, see the [paper][bluenoise93].

My implementation works fine but is not very fast, as I didn’t spend much time optimizing. It takes about 1 minute to generate a 64×64 blue noise texture on my 2018 MacBook, which is sufficient for these purposes. If something faster is needed, a promising optimization would be to apply the Gaussian Blur not in the spatial domain but in the frequency domain instead.

> **Note:** Of _course_ knowing this nerd-sniped me into implementing it. The reason this optimization is so promising is because convolution (which is the underlying operation of a Gaussian blur filter) has to loop over each field of the Gaussian kernel _for each pixel_ in the image. However, if you convert both the image as well as the Gaussian kernel to the frequency domain (using one of the many Fast Fourier Transform algorithms), convolution becomes an element-wise multiplication. I implemented the [in-place variant of the Cooley-Tukey FFT algorithm][CT FFT] and — after [some initial hickups][my wrong fft] — it did end up cutting the blue noise generation time by 50%. I still wrote pretty garbage-y code, so there’s a lot more to optimize, if anyone wants a challenge.

<figure>
  <img loading="lazy" width="256" height="128" src="./bluenoiseblur.png" class="pixelated">
  <figcaption>A 64×64 blue noise with a Gaussian blur applied (σ = 1.5). No clear structures remain.</figcaption>
</figure>

As blue noise is based on a Gaussian Blur, which is calculated on a torus (a fancy way of saying that Gaussian blur wraps around at the edges), blue noise will also tile seamlessly. So we can use the 64×64 blue noise and repeat it to cover the entire image. Blue noise dithering has a nice, even distribution without showing any obvious patterns, balancing rendering of details and organic look.

<figure>
<section class="carousel">
    <img loading="lazy" width="400" height="267" src="./dark-bluenoise.png" class="pixelated demoimage">
    <img loading="lazy" width="253" height="400" src="./light-bluenoise.png" class="pixelated demoimage">
  </section>
  <figcaption>Blue noise dithering.</figcaption>
</figure>

## Error diffusion

All the previous techniques rely on the fact that quantization errors will _statistically_ even out because the thresholds in the threshold maps are uniformly distributed. A different approach to quantization is the concept of error diffusion, which is most likely what you have read about if you have ever researched image dithering before. In this approach we don’t just quantize and hope that on average the quantization error remains negligible. Instead, we _measure_ the quantization error and diffuse the error onto neighboring pixels, influencing how they will get quantized. We are effectively changing the image we want to dither as we go along. This makes the process inherently sequential.

Almost all error diffusion ditherings that I am going to look at use a “diffusion matrix”, which defines how the quantization error from the current pixel gets distributed across the neighboring pixels. For these matrices it is often assumed that the image’s pixels are traversed top-to-bottom, left-to-right — the same way us westerners read text. This is important as the error can only be diffused to pixels that haven’t been visited (and subsequently quantized) yet. If you find yourself traversing an image in a different order than the diffusion matrix assumes, flip the matrix accordingly.

### “Simple” 2D error diffusion

The naïve approach to error diffusion shares the quantization error between the pixel below the current one and the one to the right, which can be described with the following matrix:

<figure>

$$
\left(\begin{array}{cc}
* & 0.5 \\
0.5 & 0 \\
\end{array}
\right)
$$

<figcaption>Diffusion matrix that shares half the error to 2 neightboring pixels, * marking the current pixel.</figcaption>
</figure>

The diffusion algorithm visits each pixel in the image (in the right order!), quantizes the current pixel and measures the quantization error. Note that the quantization error is signed, i.e. it can be negative if the quantization made the pixel brighter than the original brightness value. We then add fractions of the quantization error to neighboring pixels as specified by the matrix. Rinse and repeat. 

<figure>
  <video width="1280" height="1280" style="max-height: 66vh" src="./errordiffusion.mp4" type="video/mp4" autoplay muted loop controls></video>
  <figcaption>Error diffusion visualized step by step.</figcaption>
</figure>

This animation is supposed to visualize the algorithm, rather than showcase it’s effectiveness. 4×4 pixels are hardly enough do diffuse and average out quantization errors. But it does show the idea that if a pixel is made brighter during quantization, neighboring pixels will be made _darker_ to make up for it. 

<figure>
<section class="carousel">
    <img loading="lazy" width="400" height="267" src="./dark-simple2d.png" class="pixelated demoimage">
    <img loading="lazy" width="253" height="400" src="./light-simple2d.png" class="pixelated demoimage">
  </section>
<figcaption>Simple 2D error diffusion applied to our test image. The line-like patterns are typical for this simple diffusion matrix.</figcaption>
</figure>

However, the simplicity of the diffusion matrix is prone to generating patterns, like the diagonals in the test image above.

### Floyd Steinberg

Floyd Steinberg is arguably the most well-known error diffusion algorithm, if not even the most well-known dithering algorithm. It uses a more elaborate diffusion matrix to distribute the quantization error to _all_ directly neighboring, unvisited pixels. The numbers are carefully chosen to prevent repeating patterns as much as possible.

<figure>

$$
\frac{1}{16} \cdot \left(\begin{array}
{} & * & 7 \\
3 & 5 & 1 \\
\end{array}
\right)
$$

<figcaption>Diffusion matrix by Robert W. Floyd and Louis Steinberg.</figcaption>
</figure>

Floyd Steinberg is a big improvement as it prevents a lot of patterns from forming. However, larger areas with little texture can still end up looking a bit unorganic.

<figure>
<section class="carousel">
    <img loading="lazy" width="400" height="267" src="./dark-floydsteinberg.png" class="pixelated demoimage">
    <img loading="lazy" width="253" height="400" src="./light-floydsteinberg.png" class="pixelated demoimage">
  </section>
<figcaption>Floyd-Steinberg Dithering applied to our test image. Large, monotone areas still show repeating patterns.</figcaption>
</figure>

### Jarvis-Judice-Ninke

Jarvis, Judice and Ninke take an even bigger diffusion matrix, distributing the error to more pixels than just immediately neighboring ones.

<figure>

$$
\frac{1}{48} \cdot \left(\begin{array}
{} & {} & * & 7 & 5 \\
3 & 5 & 7 & 5 & 3 \\
1 & 3 & 5 & 3 & 1 \\
\end{array}
\right)
$$

<figcaption>Diffusion matrix by J. F. Jarvis, C. N. Judice, and W. H. Ninke of Bell Labs.</figcaption>
</figure>

Using this diffusion matrix, even larger, monotone areas look organic and lack repeating patterns. However, the borders of the image can appear undithered as only tiny amounts of the error are diffused to the first couple of rows.

<figure>
<section class="carousel">
    <img loading="lazy" width="400" height="267" src="./dark-jarvisjudiceninke.png" class="pixelated demoimage">
    <img loading="lazy" width="253" height="400" src="./light-jarvisjudiceninke.png" class="pixelated demoimage">
  </section>
<figcaption>Jarvis’, Judice’s and Ninke’s dithering matric creates a very organic patterns, but fails at the border of the image.</figcaption>
</figure>

### Riemersma Dither

To be completely honest, the Riemersma dither is something I stumbled upon by accident via an [in-depth article][riemersma article] while I was researching the other dithering algorithms in this article. It doesn’t seem to be widely known, but I _really_ like the way it looks and the concept behind it.  Instead of traversing the image row-by-row it traverses the image with a [Hilbert curve]. Technically, any [space-filling curve] would do, but the Hilbert curve works well and is [rather easy to implement using generators][lsystem tweet]. Through this it aims to take the best of both ordered dithering and error diffusion dithering: Limiting the number of pixels a single pixel can influence together with the organic look (and small memory footprint).

<figure>
<img loading="lazy" width="256" height="256" src="./hilbertcurve.png" class="pixelated" style="max-height: 50vh; width: auto">
<figcaption>Visualization of the 256x256 Hilbert curve by making pixels brighter the later they are visisted.</figcaption>
</figure>

The Hilbert curve has a “locality”, meaning that the pixels that are close together on the curve are also close together in the picture. This way we don’t need to use an error diffusion matrix but rather a diffusion _sequence_ of length $n$. To quantize the current pixel, the last $n$ quantization errors are added to the current pixel with the weights given in the sequence. In the article they use an exponential falloff for the weights — the last pixel’s quantization error getting a weight of 1, the oldest quantization error in the list a small, chosen weight $r$. The results in the following formula for the $i$th weight:

$$
\text{weight}[i] = r^{-\frac{i}{n-1}}
$$

The article recommends a ratio of $r = \frac{1}{16}$ and a minimum list length of $n = 16$, but for my test image I found $r = \frac{1}{8}$ and $n = 32$ to be better looking.

<figure>
  <section class="carousel">
    <img loading="lazy" width="400" height="267" src="./dark-riemersma.png" class="pixelated demoimage">
    <img loading="lazy" width="253" height="400" src="./light-riemersma.png" class="pixelated demoimage">
  </section>
  <figcaption>
  
Riemersma dither with $r = \frac{1}{8}$ and $n = 32$.
  
  </figcaption>
</figure>

The dithering looks very organic, competing with blue noise and Jarvis-Judice-Ninke, but also covers the edges of the image correctly. At the same time it is easier to implement than both of the previous ones. It is, however, still an error diffusion dithering algorithm, meaning it is sequential and not suitable to run on a GPU.

## That’d be all... for now.

Obra Dinn uses both Bayer dithering and blue noise dithering, as they can run as a shader. Most of the environment is dithered using blue noise, people and other objects of interest are dithered using Bayer. If you are curious how he handled camera movement, read his [forum post][dukope dithering].

If you want to try different dithering algorithms on one of your own images, take a look at my [demo] that I wrote to generate all the images in this blog post. Keep in mind that these are not the fastest, and if you throw your 20 megapixel camera JPEG at this, it will take a while. 

There is still a question what happens when you have more than two colors available for quantization, but that is a story for another time.


[Obra Dinn]: https://obradinn.com/
[dukope]: https://twitter.com/dukope
[Papers please]: https://papersplea.se/
[Unity]: https://unity.com/
[Squoosh]: https://squoosh.app
[dukope dithering]: https://forums.tigsource.com/index.php?topic=40832.msg1363742#msg1363742
[demo]: /lab/ditherpunk/lab.html
[lab]: /lab/ditherpunk
[bluenoise93]: ./bluenoise-1993.pdf
[bayer wikipedia]: https://en.wikipedia.org/wiki/Ordered_dithering#Pre-calculated_threshold_maps
[bayer filter]: https://en.wikipedia.org/wiki/Bayer_filter
[imagedata]: https://developer.mozilla.org/en-US/docs/Web/API/ImageData
[Christoph Peter]: https://twitter.com/momentsincg
[CP blue noise]: http://momentsingraphics.de/BlueNoise.html
[Robert Ulichney]: http://ulichney.com/
[Gaussian Blur]: https://en.wikipedia.org/wiki/Gaussian_blur
[CT FFT]: https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm#Data_reordering,_bit_reversal,_and_in-place_algorithms
[my wrong fft]: https://twitter.com/DasSurma/status/1341203941904834561
[hilbert curve]: https://en.wikipedia.org/wiki/Hilbert_curve
[riemersma article]: https://www.compuphase.com/riemer.htm
[space-filling curve]: https://en.wikipedia.org/wiki/Space-filling_curve
[lsystem tweet]: https://twitter.com/DasSurma/status/1343569629369786368
[srgb]: https://en.wikipedia.org/wiki/SRGB