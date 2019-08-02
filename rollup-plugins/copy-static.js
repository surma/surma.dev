import copy from "copy";
import { promisify } from "util";

const copyP = promisify(copy);

export default function({ src }) {
  let outputDir;
  return {
    name: "copy-static",
    outputOptions(outputOptions) {
      outputDir = outputOptions.dir;
    },
    async writeBundle() {
      await Promise.all(src.map(src => copyP(src, outputDir)));
    }
  };
}
