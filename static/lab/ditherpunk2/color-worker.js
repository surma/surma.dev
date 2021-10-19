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
      weightGenerator(32, 1/8),
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
      weightGenerator(32, 1/8),
      color => {
        let srgb = new Color("xyz", [...color]).to("srgb", {inGamut: true}).coords;
        let quant = srgb.map(v => Math.floor(v * 4) / 4);
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
