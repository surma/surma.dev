---
title: "Ditherpunk — The article I wish I had about monochrome image dithering"
date: "2020-12-15"
socialmediaimage: "social.png"
live: false
---

How can you make an image look good and close to the original when just using two colors? This article may contain traces of nostaliga and no traces of Lenna.

<!-- more -->

## How did I get here? (You can skip this)
s
I am late to the party, but I finally played [“Return of the Obra Dinn”][Obra Dinn], the most recent game by [Lucas Pope][dukope] of [“Papers Please”][Papers Please] fame. Obra Dinn is a story puzzler that I can only recommend. But what really struck me is that is a 3D game (written using the [Unity game engine][Unity]) using dithering with a monochrome color palette — a combination that I have neverseen before. Apparently, this has been dubbed “Ditherpunk”. And I like it.

<figure>
  <img src="./obradinn.png" class="pixelated">
  <figcaption>Screenshot of “Return of the Obra Dinn”.</figcaption>
</figure>

The fact that I have never seen a 3D game with this extreme level of dithering probably stems from the fact that color palettes are mostly a thing from the past. You _may_ remember running Windows 98 with 256 colors or playing games like “Monkey Island” with 16 colors.

<figure>
  <img src="./monkeyisland16.png" class="pixelated">
  <figcaption>Screenshot of “The Secret of Monkey Island” using 16 colors.</figcaption>
</figure>

For a long time now, however, we have had 8 bits per channel per pixel, allowing each pixel on your screen to assume one of 16 million colors. With HDR and wide gamut on the horizon, things are moving even further away to from requiring any form of dithering. _But I liked the way it looked._ Knowing a tiny bit about dithering from my work on [Squoosh], I was especially impressed with Obra Dinn’s ability to keep the dithering stable while I moved and rotated the camera through 3D space. I wanted to learn how this dithering magic worked.

> **Note**: As it turns out, Lucas Pope put extensive work into finding a way to make his dithering visually stable. He wrote about his attempts in a [forum blog post][dukope dithering], which features some of the dithering techniques in this article.

## Dithering
### What is Dithering?

According to Wikipedia, “Dither is an intentionally applied form of noise used to randomize quantization error”, and is a technique not limited to only images. It is actually a technique used to this day on audio recordings, but that is a rabbit hole to fall into another time. Let’s dissect this.

### Quantization 

<figure>
  <img src="original.png" class="pixelated">
  <figcaption>Our example image for this article: A black-and-white photograph of San Francisco’s Golden Gate Bridge, downscaled to 400x267 (<a href="./hires.jpg" target="_blank">higher resolution</a>).</figcaption>
</figure>

This is black-and-white photo uses 256 different shades of gray. If we wanted to use fewer colors — for example just black and white to achieve monochromaticity — we have to change the pixels that are not already black or white. In this scenario, the colors black and white are called our “color palette” and the process of changing pixels that do not use a color from the palette is called “quantization”. Because not all colors from the original image are in the color palette, this will inevitably introduce an error called the “quantization error”. 

> **Note**: The code samples in this article are real but built on top of a small helper class `GrayImageF32N0F8` I wrote for the [demo] of this article. It’s similar to the platform’s [`ImageData`][ImageData], but uses `Float32Array`, only has one color channel, represents values between 0.0 and 1.0 and has a whole bunch of helper functions. The source code is available in [the lab][lab].

A straight forward way to quantize an image with a given color palette is to find the closest color that is part of the palette. In our scenario, we can look at the brightness of every pixel. A brightness of 0 means black, a brightness of 1 means white, everything else is in-between. Ideally, correlating linearly with human perception such that a brightness of 0.5 is a nice mid-gray. Now to find the closest color in the palette for any given pixel, we only need to check if a pixel’s brightness is greater or less than 0.5. Applying this quantization to the image above yields an... unsatisfying result.

```js
grayscaleImage.mapSelf(brightness => 
  brightness > 0.5 ? 1.0 : 0.0
);
```

<figure>
  <img src="quantized.png" class="pixelated">
  <figcaption>Each pixel has been quantized to the either black or white depending on its brightness.</figcaption>
</figure>

### Random noise

Now back to Wikipedia’s definition of dithering: “Intentionally aplied form of noise used to randomize quantization error”. Instead of quantizing each pixel directly, we add noise between -0.5 and 0.5 to each pixel. The idea is that some pixels will now be quantized to the “wrong” color, but statistically the overall quantization error is reducedand our brains are also quite eager help you see the, uh, big picture.

```js
grayscaleImage.mapSelf(brightness => 
  (brightness + Math.random() - 0.5) > 0.5 ? 1.0 : 0.0
);
```

<figure>
  <img src="random.png" class="pixelated">
  <figcaption>Random noise [-0.5; 0.5] has been added to each pixel before quantization.</figcaption>
</figure>

I found this quite surprising! It is by no means _good_ — video games from the 80s have shown us that we can do better — but this is a very low effort and quick way to get more detail into a monochrome image. If we wanted to exclusively look at “dithering” in its original sense, we’d be done. 

### Threshold maps

Instead of talking about what kind of noise to add to an image before quantizing it, we can also change our perspective and talk about adjusting the quantization threshold.

```js
// Adding noise
grayscaleImage.mapSelf(brightness => 
  (brightness + Math.random() - 0.5) > 0.5 ? 1.0 : 0.0
);

// Adjusting the threshold
grayscaleImage.mapSelf(brightness => 
  brightness > Math.random() ? 1.0 : 0.0
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


The upside of this approach is that we can talk about a “threshold maps”. These maps can make it easier to reason about why a resulting image looks the way it does by visualizing the threshold map itself. Threshold maps can also be precomputed and reused, which makes the dithering process parallelizable per pixel and as a result can be run as a shader on the GPU. This is what Obra Dinn does! The threshold map for our random noise is also called “white noise”. The name comes from a term in signal processing where every frequency has the same intensity, just like in white light.

<figure>
  <img src="./whitenoise.png" class="pixelated">
  <figcaption>The threshold map for pure dithering is, by definition, white noise.</figcaption>
</figure>

## Ordered dithering

Order dithering, also sometimes called “Bayer dithering”, uses a Bayer matrix as the threshold map. Named after Bruce Bayer, inventor of the [Bayer filter] which to this day is used in digital cameras to give monochrome light sensors the ability to record color images by cleverly arranging color filters on the individual pixel sensor. The same pattern is used in the Bayer dithering threshold map and might look familiar to some of you.

Bayer matrices come in various sizes (which I ended up calling “levels”). Bayer Level 0 is 2×2 matrix. Bayer Level 1 is a 4×4 matric. Bayer Level n is a 2<sup>n+1</sup>×2<sup>n+1</sup> matrix. A level can be generated recursively (although Wikipedia also lists an [per-cell algorithm][Bayer wikipedia]) and if the image is bigger than your selected Bayer level, just repeat the threshold map (or to phrase it another way: The Bayer threshold maps wrap around at the edges). 

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

<!--
  \multicolumn{3}{c}{
    -->

<figcaption>Recursive definition of Bayer matrices.</figcaption>
</figure>

I found Bayer Level 1 and 3 the most aesthetically pleasing, and the visual differences become almost negligible for anything above 3.

<section class="carousel">
  <figure>
    <img src="bayermaps.png" class="pixelated">
    <figcaption>An enlarged view of Bayer threshold maps at increasing levels.</figcaption>
  </figure>
  <figure>
    <img src="bayer0.png" class="pixelated">
    <figcaption>Bayer Dithering Level 0.</figcaption>
  </figure>
  <figure>
    <img src="bayer1.png" class="pixelated">
    <figcaption>Bayer Dithering Level 1.</figcaption>
  </figure>
  <figure>
    <img src="bayer2.png" class="pixelated">
    <figcaption>Bayer Dithering Level 2.</figcaption>
  </figure>
  <figure>
    <img src="bayer3.png" class="pixelated">
    <figcaption>Bayer Dithering Level 3.</figcaption>
  </figure>
</section>

## Blue noise

The Bayer threshold maps as well as a white noise threshold map have the property that their average brightness value across all pixels is 0.5 (or at least very close to it). This is important for the concept of dithering. However, both types also have a flaws. Bayer dithering, for example, is very structured and will look quite repetitive, especially at lower levels. White noise contains all frequencies at equal intensity, meaning that there will be clusters of bright pixels and voids of darker pixels. This can be made more obvious by squinting or by blurring a white noise threshold map algorithmically. The clusters and voids that become more obvious when blurring are also affected the output of the dithering process, as details in darker areas will not get accurately represented if they fall into one of the cluster or brighter areas fall into a void.

<figure>
  <img src="whitenoiseblur.png" class="pixelated">
  <figcaption>Clear clusters and voids remain visible even after applying a Gaussian blur (σ = 1.5).</figcaption>
</figure>

A  source of noise is labelled _blue_ noise, because the higher frequencies (like blue light) are stronger than the lower frequencies. By removing or dampening the lower frequencies, cluster and voids become less pronounced and the threshold map gives a more even visual. Blue noise dithering is just as fast to apply to an image as white noise dithering, but generating _good_ quality blue noise is a bit harder and expensive. 

I found the [original whitepaper][bluenoise93] by [Robert Ulichney] explaining the algorithm. I found the way the algorithm is described quite unintuitive and, now that I have implemented it, I am convinced it is unnecessarily abstract. The algorithm is based on the idea that you can detect a pixel that is part of cluster (a lot of white pixels closely together) or a void (a lot of black pixels closely together) by applying a [Gaussian Blur] to the image and finding the brightest (or darkest) pixel in the blurred image. We then swap those the cluster pixels and void pixels to spread pixels as evenly as possible. Afterwards, we number all pixels (0, 1, 2, ... n, where n is the total number of pixels) based on this concept of clusters and voids. Normalizing that texture is the blue noise threshold map.

My implementation works fine but is not very fast, as I didn’t spend much time optimizing. It takes about 1 minute to generate a 64×64 blue noise texture on my 2018 MacBook, and I felt that was sufficient for these purposes. The most obvious optimization would to not apply the Gaussian Blur as a convolution filter but instead implement a Fast Fourier Transform and apply it in the frequency domain instead.

<figure>
  <img src="bluenoiseblur.png" class="pixelated">
  <figcaption>A 64×64 blue noise with a Gaussian blur applied (σ = 1.5).</figcaption>
</figure>

As blue noise is based on a Gaussian Blur, which is calculated on a torus (a fancy way of saying that these maps wrap around at the edges, too), blue noise will always tile seamlessly. So we can use the 64×64 blue noise and repeat it to cover the entire image. Blue noise dithering has a nice, even distribution without showing any obvious patterns, balancing rendering of details and organic look.

<figure>
  <img src="bluenoise.png" class="pixelated">
  <figcaption>Blue noise dithering.</figcaption>
</figure>

## Error diffusion

All the previous techniques rely on the fact that quantization errors will _statistically_ even out because of the uniform distribution of the threshold maps. A different approach to quantization is the concept of error diffusion, which is most likely what you have read about if you have ever researched image dithering before. In this approach we don’t just quantize, hoping that on average the quantization error remains negligible. Instead, we _measure_ the quantization error, and diffuse the error onto neighboring pixels, influencing the way they will get quantized. This makes the process inherently sequential but technically more accurate. 

All error diffusion ditherings that I am going to look at use a “diffusion matrix”, which defines how the quantization error gets distributed across the neighboring pixels. For these matrices it is often assumed that the image’s pixels are traversed top-to-bottom, left-to-right — the same way us westerners read text. This is important as the error can only be diffused to pixels that haven’t been visit (and subsequently quantized) yet. If you find yourself traversing an image in a different order than the diffusion matrix assumes, flip the matrix accordingly.

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

We now visit each pixels in the image in the specified order — starting in the top left, processing each row left to right. We quantize the current pixel and measure the quantization error. Note that the quantization error can be negative if the quantization made the pixel brighter than the original brightness value. We then add fractions of the quantization error to neighboring pixels as specified by matrix. Rinse and repeat. 

<figure>
  <video src="./errordiffusion.mp4" type="video/mp4" autoplay muted loop controls></video>
  <figcaption>Error diffusion visualized step by step.</figcaption>
</figure>

This animation is supposed to visualize the algorithm, rather than showcase it’s effectiveness. 4×4 pixels are hardly enough do diffuse and average out quantization error. The idea is that if a pixel is quantized to a higher brightness than it’s original brightness, then the quantization error is negative. As a result, by adding fractions of the quantization error, neighboring pixels are made _darker_. Over larger areas, quantization errors can add up to flip a white pixel to black (or vice-versa), so that areas should maintain their average.

<figure>
<img src="./simple2d.png" class="pixelated">
<figcaption>Simple 2D error diffusion applied to our test image. The line-like patterns are typical for this simple diffusion matrix.</figcaption>
</figure>

### Floyd Steinberg

Floyd Steinberg is arguably the most well-known error diffusion algorithm, if not even the most well-known dithering algorithm. It uses a more elaborate diffusion matrix to distribute the quantization error to _all_ directly neighboring, unvisited pixels. The numbers are carefully chose to prevent repeating patterns as much as possible.

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

Floyd Steinberg is a big improvement in aesthetic quality and prevents a lot of repeating patterns. However, larger areas with little texture can still end up looking a bit unorganic.

<figure>
<img src="./floydsteinberg.png" class="pixelated">
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

Using this diffusion matrixn, even on larger, monotone areas look organic and lack repeating patterns. However, the borders of the image are now incorrectly dithered as bigger parts of the error are distributed to pixels _outside_ the image. 

<figure>
<img src="./jarvisjudiceninke.png" class="pixelated">
<figcaption>Jarvis’, Judice’s and Ninke’s dithering matric creates a very organic patterns, but fails at the border of the image.</figcaption>
</figure>


[Obra Dinn]: https://obradinn.com/
[dukope]: https://twitter.com/dukope
[Papers please]: https://papersplea.se/
[Unity]: https://unity.com/
[Squoosh]: https://squoosh.app
[dukope dithering]: https://forums.tigsource.com/index.php?topic=40832.msg1363742#msg1363742
[demo]: /lab/dithering/monochrome.html
[lab]: /lab/dithering
[bluenoise93]: ./bluenoise-1993.pdf
[bayer wikipedia]: https://en.wikipedia.org/wiki/Ordered_dithering#Pre-calculated_threshold_maps
[bayer filter]: https://en.wikipedia.org/wiki/Bayer_filter
[imagedata]: https://developer.mozilla.org/en-US/docs/Web/API/ImageData
[Christoph Peter]: https://twitter.com/momentsincg
[CP blue noise]: http://momentsingraphics.de/BlueNoise.html
[Robert Ulichney]: http://ulichney.com/
[Gaussian Blur]: https://en.wikipedia.org/wiki/Gaussian_blur