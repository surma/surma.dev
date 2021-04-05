import { benchmark } from "./bench.js";
import { blurRGBA } from "./blur.js";

const data = new Uint8ClampedArray(2048 * 2048 * 4);
data.forEach((_, i, arr) => arr[i] = Math.random() * 255);

const results = await benchmark({
  async before() {
    this.data = new Uint8ClampedArray(data.slice());
  },
  async run() {
    blurRGBA(this.data, 2048, 2048, 100);
  },
});

console.log(results);
