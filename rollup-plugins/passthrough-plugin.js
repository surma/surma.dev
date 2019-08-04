import { promises as fsp } from "fs";
import { extname } from "path";

const defaultOpts = {
  extensions: ["svg", "png", "jpg"]
};

export default function(opts = {}) {
  opts = Object.assign({}, defaultOpts, opts);

  const processedFiles = new Map();
  return {
    name: "passthrough-plugin",
    async load(id) {
      if (!opts.extensions.some(ext => id.endsWith(ext))) {
        return;
      }
      let contents = await fsp.readFile(id);
      processedFiles.set(id, contents);
      // To keep Rollup quiet
      return `export default {}`;
    },
    async generateBundle(_options, bundle) {
      for (let [file, contents] of processedFiles.entries()) {
        const originalExt = extname(file);
        const [key, chunk] = Object.entries(bundle).find(
          ([key, chunk]) => chunk.facadeModuleId === file
        );
        delete bundle[key];
        chunk.code = contents;
        chunk.fileName = chunk.fileName.replace(/\.js/i, originalExt);
        bundle[chunk.fileName] = chunk;
      }
    }
  };
}
