import { benchmark } from "./bench.js";
import { BinaryHeap } from "./binaryheap.js";

const results = await benchmark({
  async run() {
    const heap = new BinaryHeap((v) => v);
    for (let i = 0; i < 1000000; i++) {
      heap.push(Math.random());
    }
    let last = Number.NEGATIVE_INFINITY;
    let current;
    while (heap.size() > 0) {
      if (current < last) {
        throw Error("Invalid ordering!");
      }
      last = current;
      current = heap.pop();
    }
  },
});

console.log(results);
