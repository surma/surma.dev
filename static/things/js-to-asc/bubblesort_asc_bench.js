import { benchmark } from "./bench.js";

const ascModule = new WebAssembly.Module(readbuffer(arguments[0]));
const results = await benchmark({
  async before() {
    this.instance = new WebAssembly.Instance(ascModule, {
      env: {
        abort() {
          throw Error("ARRGGH");
        },
      },
    });
    this.arr = new Float32Array(10000);
    this.arr.forEach((_, i) => (this.arr[i] = Math.random()));
  },
  async run() {
    const arrayPtr = this.instance.exports.newStaticArray(this.arr.length);
    new Float32Array(
      this.instance.exports.memory.buffer,
      arrayPtr,
      this.arr.length
    ).set(this.arr);
    this.instance.exports.sort(arrayPtr);
  },
  numWarmup: 0,
});
console.log(results);
