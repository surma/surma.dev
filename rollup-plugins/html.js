import * as fs from "fs";
import { join, basename } from "path";
import { createFilter } from "rollup-pluginutils";

const defaultOpts = {
  include: "**/*.html",
  exclude: [],
  minify: true
};

export default function htmlPlugin(opts) {
  opts = Object.assign({}, defaultOpts, opts);
  const filter = createFilter(opts.include, opts.exclude);

  return {
    name: "html-plugin",
    async load(id) {
      if (!filter(id)) {
        return;
      }
      this.warn(id);
      const contents = await fs.promises.readFile(id, { encoding: "utf-8" });
      const regexp = /<script src="([^"]+)"/g;
      let match;
      while ((match = regexp.exec(contents))) {
        let path = match[1].trim();
        if (path.startsWith("/")) {
          path = join(
            "/Users/surma/src/github.com/surma/surma.github.io/_site/",
            path
          );
        }
        const { id: importId } = await this.resolve(path, id);
        const chunkId = this.emitChunk(importId);
        this.warn(chunkId);
      }
      return {
        code: contents,
        ast: {
          type: "Program",
          sourceType: "module",
          body: [
            {
              type: "ExportDefaultDeclaration",
              declaration: {
                type: "FunctionDeclaration",
                id: null,
                expression: false,
                generator: false,
                params: [],
                body: {
                  type: "BlockStatement",
                  body: []
                }
              }
            }
          ],
        }
      };
    }
  };
}
