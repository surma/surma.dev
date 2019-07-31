import { promises as fsp } from "fs";
import { extname } from "path";
import { isRenegadeFile, pack, parse } from "./renegade-helpers";

const defaultOpts = {
  extensions: ["html"]
};

export default function(opts = {}) {
  opts = Object.assign({}, defaultOpts, opts);
  opts.extensions = opts.extensions.map(ext => "." + ext);

  return {
    name: "renegade-plugin",
    async load(id) {
      if (!opts.extensions.some(ext => id.endsWith(ext))) {
        return;
      }
      const data = [
        {
          type: "string",
          value: await fsp.readFile(id, "utf-8")
        }
      ];

      return pack(id, data);
    },
    async generateBundle(_options, bundle) {
      debugger;
      for (let [key, chunk] of Object.entries(bundle)) {
        if (!isRenegadeFile(chunk.code)) {
          continue;
        }
        const { id, contents } = parse(chunk.code);
        const originalExt = extname(id);
        chunk.code = contents
          .map(item => {
            switch (item.type) {
              case "string":
                return item.value;
              case "chunkRefId":
                return this.getChunkFileName(item.chunkRefId).replace(
                  /\.js$/i,
                  extname(item.importId)
                );
              default:
                throw Error(`Aaaah unknown type "${item.type}"`);
            }
          })
          .join("");
        chunk.fileName = chunk.fileName.replace(/\.js/i, originalExt);
        // bundle[chunk.fileName] = chunk;
      }
    }
  };
}
