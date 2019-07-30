import { promises as fsp } from "fs";
import { copyRegexp } from "./utils";

const defaultOpts = {
  chunkRegexp: /emitChunk\(([^)]+)\)/
};

export default function(opts = {}) {
  opts = Object.assign({}, defaultOpts, opts);
  const htmlFiles = new Map();

  return {
    name: "html-plugin",
    async load(id) {
      if (!id.endsWith(".html")) {
        return;
      }
      let contents = await fsp.readFile(id, "utf-8");
      htmlFiles.set(id, {
        refs: []
      });
      while (true) {
        const match = copyRegexp(opts.chunkRegexp).exec(contents);
        if (!match) {
          break;
        }
        let importee = match[1];
        importee = await this.resolveId(importee, id);
        const chunkRefId = this.emitChunk(importee);
        htmlFiles.get(id).refs.push(chunkRefId);
        contents =
          contents.slice(0, match.index) +
          `#${chunkRefId}#` +
          contents.slice(match.index + match[0].length);
      }
      htmlFiles.get(id).contents = contents;
      // To keep Rollup quiet
      return `export default {}`;
    },
    async generateBundle(_options, bundle) {
      for (let [htmlFile, { refs, contents }] of htmlFiles.entries()) {
        const [key, chunk] = Object.entries(bundle).find(
          ([key, chunk]) => chunk.facadeModuleId === htmlFile
        );
        for (const ref of refs) {
          contents = contents.replace(`#${ref}#`, match => {
            return this.getChunkFileName(match.slice(1, -1));
          });
        }
        delete bundle[key];
        chunk.code = contents;
        chunk.fileName = chunk.fileName.replace(".js", ".html");
        bundle[chunk.fileName] = chunk;
      }
    }
  };
}
