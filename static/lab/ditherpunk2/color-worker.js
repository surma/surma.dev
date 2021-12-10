import {
  RGBImageF32N0F8,
  GrayImageF32N0F8,
  clamp,
} from "../ditherpunk/image-utils.js";

import * as color4 from "./color4/index.js";

import {
  hilbertCurveGenerator,
  weightGenerator,
} from "../ditherpunk/curve-utils.js";

const srgb_to = {
  srgb(c) {
    return [...c];
  },
  xyz(c) {
    return color4.lin_sRGB_to_XYZ(color4.lin_sRGB(c));
  },
  lab(c) {
    return color4.XYZ_to_Lab(srgb_to.xyz(c));
  },
};

/**
 * @param {RGBImageF32N0F8} img
 * @param {GrayImageF32N0F8} diffusor
 * @param {function (Float32Array): Float32Array} quantizeFunc
 */
function matrixErrorDiffusion(
  img,
  diffusor,
  quantizeFunc,
  { normalize = true } = {}
) {
  if (normalize) {
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
      pixel: diffPixel,
    } of diffusor.allPixels()) {
      const offsetX = diffX - Math.floor((diffusor.width - 1) / 2);
      const offsetY = diffY;
      if (img.isInBounds(x + offsetX, y + offsetY)) {
        const pixel = img.pixelAt(x + offsetX, y + offsetY);
        pixel.forEach((v, i, arr) => (arr[i] = v + error[i] * diffPixel[0]));
      }
    }
  }
  return img;
}

const atkinson = new GrayImageF32N0F8(
  // prettier-ignore
  new Float32Array([ 
        0,     0, 1 / 8, 1 / 8,
    1 / 8, 1 / 8, 1 / 8,     0,
        0, 1 / 8,     0,     0,
  ]),
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
          p +
          errors.map((v) => v[ch]).reduce((sum, c, i) => sum + c * weights[i])
      )
    );
    errors.pop();
    errors.unshift(original.map((v, i) => v - quantized[i]));
    original.set(quantized);
  }
  return img;
}

const dithers = {
  /**
   * @params {RGBImageF32N0F8} color
   */
  none(color, opts, quantF) {
    return color.copy().mapSelf((color) => quantF(color));
  },
  atkinson(color, opts, quantF) {
    return matrixErrorDiffusion(color.copy(), atkinson, (color) =>
      quantF(color)
    );
  },
  riemersma(color, { n, r }, quantF) {
    return curveErrorDiffusion(
      color.copy(),
      hilbertCurveGenerator,
      weightGenerator(n, 1 / r),
      (color) => quantF(color)
    );
  },
};

/**
 * @param {Float32Array | number[]} a
 * @param {Float32Array | number[]} b
 * @returns number
 */
function euclidDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function min(els, f) {
  let minItem;
  let minVal = Number.POSITIVE_INFINITY;
  for (const el of els) {
    const val = f(el);
    if (val < minVal) {
      minItem = el;
      minVal = val;
    }
  }
  return minItem;
}

const closestcolors = {
  srgb(palette) {
    return (color) => {
      let idx = min(
        palette.map((c, i) => [i, euclidDistance(c, color)]),
        (a) => a[1]
      )[0];
      return palette[idx];
    };
  },
  xyz(palette) {
    const newPalette = palette.map((c) => srgb_to.xyz(c));
    return (color) => {
      const newColor = srgb_to.xyz(color);
      let idx = min(
        newPalette.map((c, i) => [i, euclidDistance(c, newColor)]),
        (a) => a[1]
      )[0];
      return palette[idx];
    };
  },
  lab(palette) {
    const newPalette = palette.map((c) => srgb_to.lab(c));
    return (color) => {
      const newColor = srgb_to.lab(color);
      let idx = min(
        newPalette.map((c, i) => [i, euclidDistance(c, newColor)]),
        (a) => a[1]
      )[0];
      return palette[idx];
    };
  },
  de2k(palette) {
    const newPalette = palette.map((c) => srgb_to.lab(c));
    return (color) => {
      const newColor = srgb_to.lab(color);
      let idx = min(
        newPalette.map((c, i) => [i, color4.deltaE2000(c, newColor)]),
        (a) => a[1]
      )[0];
      return palette[idx];
    };
  },
};

const palettes = {
  /**
   * @params {RGBImageF32N0F8} image
   */
  evenspaced(image, { n, space }) {
    // Try to auto-compute all values
    const dims = new Array(3);
    const white = srgb_to[space]([1, 1, 1]);
    const black = srgb_to[space]([0, 0, 0]);
    for (let i = 0; i < dims.length; i++) {
      dims[i] = {
        min: black[i],
        max: white[i],
      };
    }
    // Correct for conical spaces
    switch (space) {
      case "lch":
        dims[1] = { min: 0, max: 131 };
        dims[2] = { min: 0, max: 360 };
        break;
      case "hsl":
        dims[0] = { min: 0, max: 360 };
        dims[1] = { min: 0, max: 100 };
        break;
    }
    dims.forEach((v) => (v.inc = (v.max - v.min) / (n - 1)));

    const colors = [];
    for (let d1 = 0; d1 < n; d1++) {
      for (let d2 = 0; d2 < n; d2++) {
        for (let d3 = 0; d3 < n; d3++) {
          const indices = [d1, d2, d3];
          colors.push(indices.map((idx, i) => dims[i].min + dims[i].inc * idx));
        }
      }
    }
    return colors;
  },
  /**
   * @params {RGBImageF32N0F8} color
   */
  kmeans(color, { n, space = "srgb", maxit } = {}) {
    let centers = Array.from({ length: n }, () =>
      srgb_to[space]([Math.random(), Math.random(), Math.random()])
    );
    const colors = [...color.allPixels()].map((color) =>
      srgb_to[space](color.pixel)
    );

    function closestCenterIdx(point) {
      // console.log(JSON.stringify(centers));
      const centerIdx = min(
        centers.map(
          (center, i) => [euclidDistance(center, point), i]),
          (a) => a[0]
      )[1];
      return centerIdx;
    }

    for (let i = 0; i < maxit; i++) {
      const colorBuckets = Array.from({length: n}, () => []);
      for(const [centerIdx, color] of colors.map((color) => [closestCenterIdx(color), color])) {
        colorBuckets[centerIdx].push(color);
      }
      centers = colorBuckets.map((colorBucket) =>
        avgColor(colorBucket)
      );
    }
    return centers;
  },
};

function avgColor(v) {
  return v.reduce(
    (sum, c) => {
      sum[0] += c[0] / v.length;
      sum[1] += c[1] / v.length;
      sum[2] += c[2] / v.length;
      return sum;
    },
    [0, 0, 0]
  );
}

addEventListener("message", async (ev) => {
  const { image, dither, palette, closestcolor } = ev.data;
  const color = RGBImageF32N0F8.fromImageData(image, { linearize: false });

  const genPalette = palettes[palette.palette](color, palette.opts);
  const quantF = closestcolors[closestcolor.closestcolor](genPalette);
  const result = await dithers[dither.dither](color, dither.opts, quantF);
  postMessage({
    imageData: result.toImageData({ delinearize: false }),
  });
});
