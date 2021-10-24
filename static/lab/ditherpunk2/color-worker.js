import Color from "/node_modules/colorjs.io/src/main.js";
self.Color = Color;
import {
  RGBImageF32N0F8,
  GrayImageF32N0F8,
  clamp
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
 * @param {GrayImageF32N0F8} diffusor
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
        pixel.forEach((v, i, arr) => arr[i] = v + error[i] * diffPixel[0])
      }
    }
  }
  return img;
}

const atkinson = new GrayImageF32N0F8(
  new Float32Array([0, 0, 1/8, 1/8, 1/8, 1/8, 1/8, 0, 0, 1/8, 0, 0]),
  4,
  3
);

/**
 * @param {RGBImageF32N0F8} img
 * @param {function (number, number): Iterable<{x: number, y: number}>} curve
 * @param {number[]} weights
 * @param {function (Float32Array): Float32Array} quantF
 * @returns {RGBImageF32N0F8}
 */
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

const dithers = {
  original(color, opts) {
    return color;
  },
  atkinson(color, opts) {
    return matrixErrorDiffusion(
      color.copy(),
      atkinson,
      color => color.map(v => clamp(0, Math.floor(v * 4) / 3, 1))
    );
  },
  riemersma(color, opts) {
    return curveErrorDiffusion(
        color.copy(), 
        hilbertCurveGenerator,
        weightGenerator(32, 1/16),
        color => color.map(v => clamp(0, Math.floor(v * 4) / 3, 1))
      );
  }
};

addEventListener("message", async ev => {
  const {image, opts, dither} = ev.data;

  const color = RGBImageF32N0F8.fromImageData(image, {linearize: false});

  const result = await dithers[dither](color, opts);
  postMessage({
    imageData: result.toImageData({delinearize: false})
  });

    // const atquant = matrixErrorDiffusion(
    //   color.copy(),
    //   atkinson,
    //   color => color.map(v => clamp(0, Math.floor(v * 4) / 3, 1))
    // );
    // postMessage({
    //   type: "result",
    //   id: "atkinson",
    //   title: "Atkinson",
    //   imageData: atquant.toImageData({delinearize: false})
    // });

    // const riequant = curveErrorDiffusion(
    //   color.copy(), 
    //   hilbertCurveGenerator,
    //   weightGenerator(32, 1/16),
    //   color => color.map(v => clamp(0, Math.floor(v * 4) / 3, 1))
    // );
    // postMessage({
    //   type: "result",
    //   id: "riemersma",
    //   title: "Riemersma",
    //   imageData: riequant.toImageData({delinearize: false})
    // });

    // let colorXYZ = color.copy().mapSelf(pixel => new Color("srgb", [...pixel]).to("xyz").coords);
    // const riequantXYZ = curveErrorDiffusion(
    //   colorXYZ.copy(), 
    //   hilbertCurveGenerator,
    //   weightGenerator(32, 1/16),
    //   color => {
    //     let srgb = new Color("xyz", [...color]).to("srgb").coords;
    //     let quant = srgb.map(v => clamp(0, Math.floor(v * 4) / 3, 1));
    //     return new Color("srgb", quant).to("xyz").coords;
    //   }

    // );
    // postMessage({
    //   type: "result",
    //   id: "riemersma_xyz",
    //   title: "Riemersma XYZ",
    //   imageData: riequantXYZ.mapSelf(pixel => new Color("xyz", [...pixel]).to("srgb", {inGamut: true}).coords).toImageData({delinearize: false})
    // });

    // const atquantXYZ = matrixErrorDiffusion(
    //   colorXYZ.copy(),
    //   atkinson,
    //   color => {
    //     let srgb = new Color("xyz", [...color]).to("srgb").coords;
    //     let quant = srgb.map(v => clamp(0, Math.floor(v * 4) / 3, 1));
    //     return new Color("srgb", quant).to("xyz").coords;
    //   }
    // );
    // postMessage({
    //   type: "result",
    //   id: "atkinson_xyz",
    //   title: "Atkinson XYZ",
    //   imageData: atquantXYZ.mapSelf(pixel => new Color("xyz", [...pixel]).to("srgb", {inGamut: true}).coords).toImageData({delinearize: false})
    // });
  });