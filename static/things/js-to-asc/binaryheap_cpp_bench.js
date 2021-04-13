import { benchmark } from "./bench.js";

load("binaryheap_idiomatic_cpp.js");

Module.onRuntimeInitialized = async () => {
  const results = await benchmark({
    async before() {
      this.instance = Module;
      this.instance.init();
    },
    async run() {
      for (let i = 0; i < 1000000; i++) {
        this.instance.push(Math.random());
      }
      let last = Number.NEGATIVE_INFINITY;
      while (this.instance.size() > 0) {
        const current = this.instance.pop();
        if (current < last) {
          console.log(`current=${current}, last=${last}`);
          throw Error(
            `Invalid ordering! Left: ${this.instance.exports.size()}`
          );
        }
        last = current;
      }
    },
    numWarmup: 0,
  });
  console.log(results);
};
