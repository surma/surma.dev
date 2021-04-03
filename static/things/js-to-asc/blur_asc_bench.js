import { benchmark } from "./bench.js";

const data = readbuffer("image.dat");

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
    this.data = new Uint8ClampedArray(data.slice());
  },
  async run() {
    const arrayViewPtr = this.instance.exports.newUint8ClampedArray(
      this.data.byteLength
    );
    const dataView = new DataView(this.instance.exports.memory.buffer);
    // Get pointer to data section of the underlying array buffer
    const dataPtr = dataView.getUint32(arrayViewPtr + 4, true);
    // Copy image data into linear memory
    new Uint8ClampedArray(
      this.instance.exports.memory.buffer,
      dataPtr,
      this.data.byteLength
    ).set(this.data);
    this.instance.exports.blurRGBA(arrayViewPtr, 3872, 2592, 100);
  },
  numWarmup: 0,
});
console.log(results);
