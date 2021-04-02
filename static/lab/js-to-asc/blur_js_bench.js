import { benchmark } from "./bench.js";
import { blurRGBA } from "./blur.js";

const data = readbuffer("image.dat");

const results = await benchmark({
  async before() {
    this.data = new Uint8ClampedArray(data.slice());
  },
  async run() {
    blurRGBA(this.data, 3872, 2592, 100);
  },
});

console.log(results);
