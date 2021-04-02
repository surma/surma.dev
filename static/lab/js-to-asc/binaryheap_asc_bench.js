import { benchmark } from "./bench.js";

const ascModule = new WebAssembly.Module(readbuffer(arguments[0]));

const results = await benchmark({
  async before() {
    this.instance = new WebAssembly.Instance(ascModule, {
      env: {
        abort(msgPtr, fileNamePtr, lineNumber) {
          throw Error("AAARGH");
        },
      },
    });
    this.instance.exports.init();
  },
  async run() {
    for (let i = 0; i < 1000000; i++) {
      this.instance.exports.push(Math.random());
    }
    let last = Number.NEGATIVE_INFINITY;
    while (this.instance.exports.size() > 0) {
      const current = this.instance.exports.pop();
      if (current < last) {
        console.log(`current=${current}, last=${last}`);
        throw Error(`Invalid ordering! Left: ${this.instance.exports.size()}`);
      }
      last = current;
    }
  },
  numWarmup: 0,
});
console.log(results);
