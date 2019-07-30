import { promises as fsp } from "fs";
import { copyRegexp } from "./utils";
import { join, extname } from "path";

const defaultOpts = {
  extension: "html",
  baseDir: __dirname,
  chunkRegexp: /emitChunk\(([^)]+)\)/
};

export default function(opts = {}) {
  opts = Object.assign({}, defaultOpts, opts);
  opts.extension = "." + opts.extension;

  const processedFiles = new Map();

  return {
    name: "emit-chunk-plugin",
    async load(id) {
      if (!id.endsWith(opts.extension)) {
        return;
      }
      let contents = await fsp.readFile(id, "utf-8");
      processedFiles.set(id, {
        refs: []
      });
      while (true) {
        const match = copyRegexp(opts.chunkRegexp).exec(contents);
        if (!match) {
          break;
        }
        let importee = match[1];
        if (importee.startsWith("/")) {
          importee = join(opts.baseDir, "." + importee);
        } else {
          importee = await this.resolveId(importee, id);
        }
        const chunkRefId = this.emitChunk(importee);
        const ext = extname(importee);
        processedFiles.get(id).refs.push({ chunkRefId, ext });
        contents =
          contents.slice(0, match.index) +
          `#${chunkRefId}#` +
          contents.slice(match.index + match[0].length);
      }
      processedFiles.get(id).contents = contents;
      // To keep Rollup quiet
      return `export default {}`;
    },
    async generateBundle(_options, bundle) {
      for (let [file, { refs, contents }] of processedFiles.entries()) {
        const [key, chunk] = Object.entries(bundle).find(
          ([key, chunk]) => chunk.facadeModuleId === file
        );
        for (const { chunkRefId, ext } of refs) {
          contents = contents.replace(`#${chunkRefId}#`, match => {
            return this.getChunkFileName(match.slice(1, -1)).replace(
              /\.js$/i,
              ext
            );
          });
        }
        delete bundle[key];
        chunk.code = contents;
        chunk.fileName = chunk.fileName.replace(/\.js/i, opts.extension);
        bundle[chunk.fileName] = chunk;
      }
    }
  };
}
