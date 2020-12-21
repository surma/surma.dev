---
title: "Ditherpunk — The article I wish I had about monochrome image dithering"
date: "2020-12-15"
socialmediaimage: "social.png"
live: false
---

I always loved the visual aesthetic of dithering but never knew how exactly it is... achieved. This article may contain traces of nostaliga and none of Lenna.

<!-- more -->

## How did I get here? (You can skip this)

I am late to the party, but I finally played [“Return of the Obra Dinn”][Obra Dinn], the most recent game by [Lucas Pope][dukope] of [“Papers Please”][Papers Please] fame. Obra Dinn is a story puzzler that I can only recommend. But what really struck me is that is a 3D game (using the [Unity game engine][Unity]) but rendered using only 2 colors with dithering. Apparently, this has been dubbed “Ditherpunk”, and I love that.

<figure>
  <img loading="lazy" src="./obradinn.png" class="pixelated">
  <figcaption>Screenshot of “Return of the Obra Dinn”.</figcaption>
</figure>

The fact that I have never seen a 3D game with dithering like this probably stems from the fact that color palettes are mostly a thing of the past. You _may_ remember running Windows 95 with 16 colors or playing games like “Monkey Island” on it.

<section class="carousel">
  <figure>
    <img src="./win95.png">
    <figcaption>Windows 95 configured to use 16 colors. Now spend hours trying to find the right floppy disk with the drivers to get the “256 colors” or, <em>gasp</em>, “True Color” show up.</figcaption>
  </figure>
  <figure>
    <img src="./monkeyisland16.png" class="pixelated">
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
  <img loading="lazy" src="original.png" class="pixelated">
  <figcaption>Our example image for this article: A black-and-white photograph of San Francisco’s Golden Gate Bridge, downscaled to 400x267 (<a href="./hires.jpg" target="_blank">higher resolution</a>).</figcaption>
</figure>

This is black-and-white photo uses 256 different shades of gray. If we wanted to use fewer colors — for example just black and white to achieve monochromaticity — we have to change the pixels that are not already black or white. In this scenario, the colors black and white are called our “color palette” and the process of changing pixels that do not use a color from the palette is called “quantization”. Because not all colors from the original image are in the color palette, this will inevitably introduce an error called the “quantization error”. 

> **Note**: The code samples in this article are real but built on top of a helper class `GrayImageF32N0F8` I wrote for the [demo] of this article. It’s similar to the web’s [`ImageData`][ImageData], but uses `Float32Array`, only has one color channel, represents values between 0.0 and 1.0 and has a whole bunch of helper functions. The source code is available in [the lab][lab].

A straight forward way to quantize an image with a given color palette is to find the closest color in the palette. In our scenario, we can look at the brightness of every pixel. A brightness of 0 means black, a brightness of 1 means white, everything else is in-between, ideally correlating with human perception such that a brightness of 0.5 is a nice mid-gray.To quantize a given color, we only need to check if the color’s brightness is greater or less than 0.5 and quantize to white and black respectively. Applying this quantization to the image above yields an... unsatisfying result.

```js
grayscaleImage.mapSelf(brightness => 
  brightness > 0.5 ? 1.0 : 0.0
);
```

<figure>
  <img loading="lazy" src="quantized.png" class="pixelated">
  <figcaption>Each pixel has been quantized to the either black or white depending on its brightness.</figcaption>
</figure>

### Random noise

Back to Wikipedia’s definition of dithering: “Intentionally applied form of noise used to randomize quantization error”. Instead of quantizing each pixel directly, we add noise between -0.5 and 0.5 to each pixel. The idea is that some pixels will now be quantized to the “wrong” color, but how often that happens depends on the pixel’s original brightness. Black will _always_ remain black, white will _always_ remain white, a mid-gray will be black only roughly 50% of the time. Statistically, the overall quantization error is reduced and our brains are quite eager to do the rest and help you see the, uh, big picture.

```js
grayscaleImage.mapSelf(brightness => 
  (brightness + Math.random() - 0.5) > 0.5 ? 1.0 : 0.0
);
```

<figure>
  <img loading="lazy" src="random.png" class="pixelated">
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
  <img loading="lazy" src="./whitenoise.png" class="pixelated">
  <figcaption>The threshold map for O.G. dithering is, by definition, white noise.</figcaption>
</figure>

## Ordered dithering

Ordered dithering, also sometimes called “Bayer dithering”, uses a Bayer matrix as the threshold map. They are named after Bruce Bayer, inventor of the [Bayer filter], which is in use to this day in digital cameras to give monochrome light sensors the ability to take color images by cleverly arranging colored filters on the individual pixel sensors. The same pattern is used in the Bayer dithering threshold map and might look familiar to some of you.

Bayer matrices come in various sizes (which I ended up calling “levels”). Bayer Level 0 is 2×2 matrix. Bayer Level 1 is a 4×4 matric. Bayer Level n is a $2^{n+1} \times 2^{n+1}$ matrix. A level can be generated recursively (although Wikipedia also lists an [per-cell algorithm][Bayer wikipedia]) and if your image happens to be bigger than your threshold map, you can tile the threshold map. 

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

A level n Bayer matrix contains the number $0$ to $2^{2n+2}$. To use them as a threshold map, you need to normalize them, i.e. divide by $2^{2n+2}$. Anything above level 3 barely makes a difference in the resulting visual as far as I can tell, and I personally found Level 1 and 3 the most aesthetically pleasing.

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

Both white noise and Bayer dithering have drawbacks, of course. Bayer dithering, for example, is very structured and will look quite repetitive, especially at lower levels. White noise is random, meaning that there will be clusters of bright pixels and voids of darker pixels. This can be made more obvious by squinting or, if that is too much work for you, through blurring  algorithmically. These clusters and voids are affecting the output of the dithering process as well, as details in darker areas will not get accurately represented if they fall into one of the cluster or brighter areas fall into a void.

<figure>
  <img loading="lazy" src="whitenoiseblur.png" class="pixelated">
  <figcaption>Clear clusters and voids remain visible even after applying a Gaussian blur (σ = 1.5).</figcaption>
</figure>

A source of noise that tries to address this is labelled _blue_ noise, because the higher frequencies (like blue light) higher intensities than the lower frequencies. By removing or dampening the lower frequencies, cluster and voids become less pronounced and the threshold map gives a more even visual. Blue noise dithering is just as fast to apply to an image as white noise dithering, but generating _good_ quality blue noise is a bit harder and expensive. 

The most common algorithm to generate blue noise seems to be the “void-and-cluster method” by [Robert Ulichney]. Here is the [original whitepaper][bluenoise93]. I found the way the algorithm is described quite unintuitive and, now that I have implemented it, I am convinced it is unnecessarily abstract. 

The algorithm is based on the idea that you can detect a pixel that is part of cluster or a void by applying a [Gaussian Blur] to the image and finding the brightest (or darkest) pixel in the blurred image respectively. After initializing a black image with a couple of random white pixels, the algorihtm proceeds to continuously swap cluster pixels and void pixels to spread the white pixels out as evenly as possible. Afterwards, every pixel gets a number between 0 and n (where n is the total number of pixels) according to their importance for forming clusters and voids. For more details, see the [paper][bluenoise93].

My implementation works fine but is not very fast, as I didn’t spend much time optimizing. It takes about 1 minute to generate a 64×64 blue noise texture on my 2018 MacBook, which is sufficient for these purposes. If something faster is needed, the most obvious optimization would to apply the Gaussian Blur not as a convolution filter but in the frequency domain instead. 

<figure>
  <img loading="lazy" src="bluenoiseblur.png" class="pixelated">
  <figcaption>A 64×64 blue noise with a Gaussian blur applied (σ = 1.5). No clear structures remain.</figcaption>
</figure>

As blue noise is based on a Gaussian Blur, which is calculated on a torus (a fancy way of saying that Gaussian blur wraps around at the edges), blue noise will also tile seamlessly. So we can use the 64×64 blue noise and repeat it to cover the entire image. Blue noise dithering has a nice, even distribution without showing any obvious patterns, balancing rendering of details and organic look.

<figure>
  <img loading="lazy" src="bluenoise.png" class="pixelated">
  <figcaption>Blue noise dithering.</figcaption>
</figure>

## Error diffusion

All the previous techniques rely on the fact that quantization errors will _statistically_ even out because of the thresholds in the threshold maps are uniformly distributed. A different approach to quantization is the concept of error diffusion, which is most likely what you have read about if you have ever researched image dithering before. In this approach we don’t just quantize, hoping that on average the quantization error remains negligible. Instead, we _measure_ the quantization error, and diffuse the error onto neighboring pixels, influencing how they will get quantized. This makes the process inherently sequential but technically more accurate. 

All error diffusion ditherings that I am going to look at use a “diffusion matrix”, which defines how the quantization error gets distributed across the neighboring pixels. For these matrices it is often assumed that the image’s pixels are traversed top-to-bottom, left-to-right — the same way us westerners read text. This is important as the error can only be diffused to pixels that haven’t been visited (and subsequently quantized) yet. If you find yourself traversing an image in a different order than the diffusion matrix assumes, flip the matrix accordingly.

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

We now visit each pixel in the image (in the right order!). We quantize the current pixel and measure the quantization error. Note that the quantization error can be negative if the quantization made the pixel brighter than the original brightness value. We then add fractions of the quantization error to neighboring pixels as specified by matrix. Rinse and repeat. 

<figure>
  <video style="max-height: 66vh" src="./errordiffusion.mp4" type="video/mp4" autoplay muted loop controls></video>
  <figcaption>Error diffusion visualized step by step.</figcaption>
</figure>

This animation is supposed to visualize the algorithm, rather than showcase it’s effectiveness. 4×4 pixels are hardly enough do diffuse and average out quantization error. The idea is that if a pixel is made brighter during quantization, neighboring pixels will be made _darker_ to make up for it. 

<figure>
<img loading="lazy" src="./simple2d.png" class="pixelated">
<figcaption>Simple 2D error diffusion applied to our test image. The line-like patterns are typical for this simple diffusion matrix.</figcaption>
</figure>

However, the simplicity of the diffusion matrix is prone to generating patterns, like the diagonals in the test image above.

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

Floyd Steinberg is a big improvement as it prevents a lot of patterns from forming. However, larger areas with little texture can still end up looking a bit unorganic.

<figure>
<img loading="lazy" src="./floydsteinberg.png" class="pixelated">
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
<img loading="lazy" src="./jarvisjudiceninke.png" class="pixelated">
<figcaption>Jarvis’, Judice’s and Ninke’s dithering matric creates a very organic patterns, but fails at the border of the image.</figcaption>
</figure>

## That’d be all... for now.

Obra Dinn uses both Bayer dithering and blue noise dithering. Most of the environment is dithered using blue noise, people and other objects of interest are dithered using Bayer. If you are curious how he handled camera movement, read his [forum post][dukope dithering].

If you want to dither your own images, take a look at my [demo] that I wrote to generate all the images in the blog post. There is still a question what happens when you have more than two colors, but that is a story for another time.


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