import { MessageStream } from "./worker-utils.js";

const bayerCache = [new Float32Array([0, 3, 2, 1])];

function bayerValue(values, { x, y }) {
  const size = Math.sqrt(values.length);
  return values[y * size + x];
}

function calculateBayerLevel(level) {
  if (!bayerCache[level]) {
    const bayerSize = 2 ** (level + 1);
    const bayer = new Float32Array(bayerSize * bayerSize);
    const prevLevel = calculateBayerLevel(level - 1);
    const halfSize = bayerSize / 2;
    for (let y = 0; y < bayerSize; y++) {
      const quadrantY = y >= bayerSize / 2 ? 1 : 0;
      for (let x = 0; x < bayerSize; x++) {
        const quadrantX = x >= bayerSize / 2 ? 1 : 0;
        bayer[y * bayerSize + x] =
          4 * bayerValue(prevLevel, { y: y % halfSize, x: x % halfSize }) +
          bayerValue(bayerCache[0], { y: quadrantY, x: quadrantX });
      }
    }
    bayerCache[level] = bayer;
  }
  return bayerCache[level];
}

async function init() {
  const reader = MessageStream().getReader();

  while (true) {
    const {
      value: { width, height, level, id }
    } = await reader.read();

    const bayer = calculateBayerLevel(level);
    const size = Math.sqrt(bayer.length);
    const result = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        result[y * width + x] =
          bayerValue(bayer, { x: x % size, y: y % size }) / size ** 2;
      }
    }
    postMessage({ id, result });
  }
}
init();
