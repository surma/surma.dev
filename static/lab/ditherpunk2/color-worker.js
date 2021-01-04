import { MessageStream, message } from "../ditherpunk/worker-utils.js";
import {
  RGBImageF32N0F8,
  GrayImageF32N0F8,
  clamp,
  srgbToLinear,
  linearToSrgb
} from "../ditherpunk/image-utils.js";
import {
  hilbertCurveGenerator,
  weightGenerator
} from "../ditherpunk/curve-utils.js";

const myBluenoisePromise = message(self, "bluenoise").then(({ mask }) => {
  Object.setPrototypeOf(mask, GrayImageF32N0F8.prototype);
  mask.mapSelf(v => srgbToLinear(v));
  return mask;
});

let bayerLevels = message(self, "bayerlevels").then(({ bayerLevels }) =>
  bayerLevels.map(bl => {
    Object.setPrototypeOf(bl, GrayImageF32N0F8.prototype);
    bl.mapSelf(v => srgbToLinear(v));
    return bl;
  })
);

function createEvenPaletteQuantizer(n) {
  n = clamp(2, n, 255) - 1;
  return p => p.map(p => clamp(0, Math.round(p * n) / n, 1));
}

function remap(a, b) {
  return v => v * (b - a) + a;
}

const numColors = 3;
const pipeline = [
  ...Array.from({ length: numColors }, (_, i) => {
    const colorsPerAxis = i + 2;
    const n = colorsPerAxis ** 3;
    const q = createEvenPaletteQuantizer(colorsPerAxis);
    const vmap = remap(-1 / colorsPerAxis, 1 / colorsPerAxis);
    return [
      {
        id: `quantized:${n}`,
        title: `Quantized (${n} colors)`,
        async process(color) {
          return color.copy().mapSelf(q);
        }
      },
      {
        id: `dither:${n}`,
        title: `Dithering (${n} colors)`,
        async process(color) {
          return color
            .copy()
            .mapSelf(v => q(v.map(v => v + vmap(Math.random()))));
        }
      },
      {
        id: `bayer1:${n}`,
        title: `Bayer Level 1 (${n} colors)`,
        async process(color, { bayerLevels }) {
          const bayerLevel = (await bayerLevels)[1];
          return color
            .copy()
            .mapSelf((v, { x, y }) =>
              q(
                v.map(
                  v => v + vmap(bayerLevel.valueAt({ x, y }, { wrap: true }))
                )
              )
            );
        }
      },
      {
        id: `bayer3:${n}`,
        title: `Bayer Level 3 (${n} colors)`,
        async process(color, { bayerLevels }) {
          const bayerLevel = (await bayerLevels)[3];
          return color
            .copy()
            .mapSelf((v, { x, y }) =>
              q(
                v.map(
                  v => v + vmap(bayerLevel.valueAt({ x, y }, { wrap: true }))
                )
              )
            );
        }
      },
      {
        id: `2ded:${n}`,
        title: `Simple Error Diffusion (${n} colors)`,
        async process(color) {
          return errorDiffusion(
            color.copy(),
            new GrayImageF32N0F8(new Float32Array([0, 1, 1, 0]), 2, 2),
            q
          );
        }
      },
      {
        id: `fsed:${n}`,
        title: `Floyd-Steinberg Error Diffusion (${n} colors)`,
        async process(color) {
          return errorDiffusion(
            color.copy(),
            new GrayImageF32N0F8(new Float32Array([0, 0, 7, 1, 5, 3]), 3, 2),
            q
          );
        }
      },
      {
        id: `jjned:${n}`,
        title: `Jarvis-Judice-Ninke Error Diffusion (${n} colors)`,
        async process(color) {
          return errorDiffusion(
            color.copy(),
            new GrayImageF32N0F8(
              new Float32Array([0, 0, 0, 7, 5, 3, 5, 7, 5, 3, 1, 3, 5, 3, 1]),
              5,
              3
            ),
            q
          );
        }
      },
      {
        id: `riemersma:${n}`,
        title: `Riemersma (${n} colors)`,
        async process(color) {
          return curveErrorDiffusion(
            color.copy(),
            hilbertCurveGenerator,
            weightGenerator(32, 1 / 8),
            (p1, p2) =>
              new Float32Array([p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]]),
            q
          );
        }
      },
      {
        id: `bluenoise:${n}`,
        title: `Blue Noise (${n} colors)`,
        async process(color) {
          const bluenoise = await myBluenoisePromise;
          return color
            .copy()
            .mapSelf((v, { x, y }) =>
              q(
                v.map(
                  v => v + vmap(bluenoise.valueAt({ x, y }, { wrap: true }))
                )
              )
            );
        }
      }
    ];
  }).flat()
];

function curveErrorDiffusion(img, curve, weights, distance, quantF) {
  const curveIt = curve(img.width, img.height);
  const errors = Array.from(weights, () => new Float32Array([0, 0, 0]));
  for (const p of curveIt) {
    if (!img.isInBounds(p.x, p.y)) {
      continue;
    }
    const original = img.pixelAt(p.x, p.y);
    const quantized = quantF(
      original.map(
        (p, ch) =>
          p + errors.map(v => v[ch]).reduce((sum, c, i) => sum + c * weights[i])
      )
    );
    errors.pop();
    errors.unshift(original.map((v, i) => v - quantized[i]));
    original.set(quantized);
  }
  return img;
}

function errorDiffusion(img, diffusor, quantizeFunc) {
  diffusor.normalizeSelf();
  for (const { x, y, pixel } of img.allPixels()) {
    const quantized = quantizeFunc(pixel);
    const error = pixel.map((v, i) => v - quantized[i]);
    pixel.set(quantized);
    for (const {
      x: diffX,
      y: diffY,
      pixel: diffPixel
    } of diffusor.allPixels()) {
      const offsetX = diffX - Math.floor((diffusor.width - 1) / 2);
      const offsetY = diffY;
      if (img.isInBounds(x + offsetX, y + offsetY)) {
        const pixel = img.pixelAt(x + offsetX, y + offsetY);
        pixel.set(pixel.map((v, i) => v + error[i] * diffPixel[0]));
      }
    }
  }
  return img;
}

async function init() {
  const reader = MessageStream().getReader();

  while (true) {
    const {
      value: { image, id }
    } = await reader.read();
    if (id != "image") {
      continue;
    }

    postMessage({
      type: "result",
      id: "original",
      title: "Original",
      imageData: image
    });

    const color = RGBImageF32N0F8.fromImageData(image);

    for (const step of pipeline) {
      let title = step.title;
      if (typeof step.title === "function") {
        title = step.title();
      }
      postMessage({
        type: "started",
        id: step.id,
        title
      });
      const result = await step.process(color, { bayerLevels });
      if (typeof step.title === "function") {
        title = step.title();
      }
      postMessage({
        type: "result",
        title,
        id: step.id,
        imageData: result.toImageData()
      });
    }
  }
}
init();
