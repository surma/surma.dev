import { benchmark } from "./bench.js";
import { sort } from "./bubblesort.js";

const results = await benchmark({
  async before() {
    this.arr = Array.from({ length: 10000 }, () => Math.random());
  },
  async run() {
    sort(this.arr);
  },
});

console.log(results);
