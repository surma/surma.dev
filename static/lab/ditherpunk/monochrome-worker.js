import { MessageStream, message, uid } from "./worker-utils.js";
import { GrayImageF32N0F8 } from "./image-utils.js";

const numBayerLevels = 4;
let bayerWorker;
if (typeof process !== "undefined" && process.env.TARGET_DOMAIN) {
  bayerWorker = new Worker("./bayer-worker.js", { name: "bayer" });
} else {
  bayerWorker = new Worker("./bayer-worker.js", {
    name: "bayer",
    type: "module"
  });
}
bayerWorker.addEventListener("error", () =>
  console.error("Something went wrong in the Bayer worker")
);

let myBluenoiseDuration;
const myBluenoisePromise = message(self, "bluenoise").then(
  ({ mask, duration }) => {
    myBluenoiseDuration = duration;
    Object.setPrototypeOf(mask, GrayImageF32N0F8.prototype);
    postMessage({
      id: "x1",
      title: "Blue noise",
      type: "result",
      imageData: mask.toImageData()
    });
    const v = mask.toComplex().fftSelf().abs();
    const m = v.max().pixel[0];
    postMessage({
      id: "x2",
      title: "Blue noise Pwoer Spectrum",
      type: "result",
      imageData: v.mapSelf(v => (v/m)**.2).toImageData()
    });
    return mask;
  }
);

const pipeline = [
  {
    id: "quantized",
    title: "Quantized",
    async process(grayscale) {
      return grayscale.copy().mapSelf(v => (v > 0.5 ? 1.0 : 0.0));
    }
  },
  {
    id: "random",
    title: "Dithering",
    async process(grayscale) {
      return grayscale
        .copy()
        .mapSelf(v => (v + Math.random() - 0.5 > 0.5 ? 1.0 : 0.0));
    }
  },
  ...Array.from({ length: numBayerLevels }, (_, level) => {
    return {
      id: `bayer-${level}`,
      title: `Bayer Level ${level}`,
      async process(grayscale, { bayerLevels }) {
        const bayerLevel = await bayerLevels[level];
        return grayscale
          .copy()
          .mapSelf((v, { i }) =>
            v + bayerLevel.pixel(i)[0] - 0.5 > 0.5 ? 1.0 : 0.0
          );
      }
    };
  }),
  {
    id: "2derrdiff",
    title: "Simple Error Diffusion",
    async process(grayscale) {
      return errorDiffusion(
        grayscale.copy(),
        new GrayImageF32N0F8(new Float32Array([0, 1, 1, 0]), 2, 2),
        v => (v > 0.5 ? 1.0 : 0.0)
      );
    }
  },
  {
    id: "floydsteinberg",
    title: "Floyd-Steinberg Diffusion",
    async process(grayscale) {
      return errorDiffusion(
        grayscale.copy(),
        new GrayImageF32N0F8(new Float32Array([0, 0, 7, 1, 5, 3]), 3, 2),
        v => (v > 0.5 ? 1.0 : 0.0)
      );
    }
  },
  {
    id: "jjn",
    title: "Jarvis-Judice-Ninke Diffusion",
    async process(grayscale) {
      return errorDiffusion(
        grayscale.copy(),
        new GrayImageF32N0F8(
          new Float32Array([0, 0, 0, 7, 5, 3, 5, 7, 5, 3, 1, 3, 5, 3, 1]),
          5,
          3
        ),
        v => (v > 0.5 ? 1.0 : 0.0)
      );
    }
  },
  {
    id: "mybluenoise",
    title: () =>
      `Blue Noise (${
        myBluenoiseDuration
          ? `${myBluenoiseDuration.toFixed(1)}ms`
          : "takes a bit..."
      })`,
    async process(grayscale) {
      const bluenoise = await myBluenoisePromise;
      const result = grayscale.copy();
      for (const { x, y, pixel } of result.allPixels()) {
        pixel[0] = pixel[0] + bluenoise.pixelAt(x, y, { wrap: true })[0] - 0.5;
        pixel[0] = pixel[0] > 0.5 ? 1.0 : 0.0;
      }
      return result;
    }
  }
];

function errorDiffusion(img, diffusor, quantizeFunc) {
  diffusor.normalizeSelf();
  for (const { x, y, pixel } of img.allPixels()) {
    const original = pixel[0];
    const quantized = quantizeFunc(original);
    pixel[0] = quantized;
    const error = original - quantized;
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

async function init() {
  const reader = MessageStream().getReader();

  while (true) {
    const {
      value: { image, id }
    } = await reader.read();
    if (id != "image") {
      continue;
    }
    const jobId = uid();
    const bayerLevels = Array.from({ length: numBayerLevels }, (_, i) => {
      const id = `${jobId}-${i}`;
      bayerWorker.postMessage({
        width: image.width,
        height: image.height,
        level: i,
        id
      });
      return message(bayerWorker, id).then(m =>
        Object.setPrototypeOf(m.result, GrayImageF32N0F8.prototype)
      );
    });

    postMessage({
      type: "result",
      id: "original",
      title: "Original",
      imageData: image
    });

    const grayscale = GrayImageF32N0F8.fromImageData(image);
    postMessage({
      type: "result",
      id: "grayscale",
      title: "Grayscale",
      imageData: grayscale.toImageData()
    });

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
      const result = await step.process(grayscale, { bayerLevels });
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
