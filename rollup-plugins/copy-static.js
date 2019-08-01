import { ncp } from "ncp";

export default function({ src }) {
  let outputDir;
  return {
    name: "copy-static",
    outputOptions(outputOptions) {
      outputDir = outputOptions.dir;
    },
    async writeBundle() {
      await Promise.all(src.map(src => ncp(src, outputDir)));
    }
  };
}
