import Color from "/node_modules/colorjs.io/src/main.js";
self.Color = Color;
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



function createEvenPaletteQuantizer(n) {
  n = clamp(2, n, 255) - 1;
  return p => {
    if (typeof p === "number") {
      p = [p];
    }
    return p.map(p => clamp(0, Math.round(p * n) / n, 1));
  };
}

function remap(a, b) {
  return v => v * (b - a) + a;
}

/**
 * @param {RGBImageF32N0F8} img
 * @param {Float32Array} diffusor
 * @param {function (Float32Array): Float32Array} quantizeFunc
 */
function matrixErrorDiffusion(img, diffusor, quantizeFunc, {normalize = true} = {}) {
  if(normalize) {
    diffusor.normalizeSelf();
  }
  for (const { x, y, pixel } of img.allPixels()) {
    const original = pixel.slice();
    const quantized = quantizeFunc(original);
    pixel.set(quantized);
    const error = original.map((v, i) => v - quantized[i]);
    for (const {
      x: diffX,
      y: diffY,
      pixel: diffPixel
    } of diffusor.allPixels()) {
      const offsetX = diffX - Math.floor((diffusor.width - 1) / 2);
      const offsetY = diffY;
      if (img.isInBounds(x + offsetX, y + offsetY)) {
        const pixel = img.pixelAt(x + offsetX, y + offsetY);
        pixel[0] = pixel[0] + error * diffPixel[0];
      }
    }
  }
  return img;
}

function curveErrorDiffusion(img, curve, weights, quantF) {
  const curveIt = curve(img.width, img.height);
  const errors = Array.from(
    weights,
    () => new Float32Array(img.constructor.NUM_CHANNELS)
  );
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

async function init() {
  const reader = MessageStream().getReader();

  while (true) {
    const {
      value: { image, id }
    } = await reader.read();
    if (id != "image") {
      continue;
    }

    const color = RGBImageF32N0F8.fromImageData(image);

    postMessage({
      type: "result",
      id: "original",
      title: "Original",
      imageData: color.toImageData()
    });

    const quant = curveErrorDiffusion(
      color.copy(), 
      hilbertCurveGenerator,
      weightGenerator(32, 1/16),
      color => color.map(v => Math.floor(v * 4) / 4)
    );
    postMessage({
      type: "result",
      id: "riemersma",
      title: "Riemersma",
      imageData: quant.toImageData()
    });

    let colorXYZ = color.copy().mapSelf(pixel => new Color("srgb", [...pixel]).to("xyz").coords);
    const quantXYZ = curveErrorDiffusion(
      colorXYZ.copy(), 
      hilbertCurveGenerator,
      weightGenerator(32, 1/16),
      color => {
        let srgb = new Color("xyz", [...color]).to("srgb").coords;
        let quant = srgb.map(v => clamp(0, Math.floor(v * 4) / 4, 1));
        return new Color("srgb", quant).to("xyz").coords;
      }

    );
    postMessage({
      type: "result",
      id: "riemersma_xyz",
      title: "Riemersma_xyz",
      imageData: quantXYZ.mapSelf(pixel => new Color("xyz", [...pixel]).to("srgb", {inGamut: true}).coords).toImageData()
    });
  }
}
init();
