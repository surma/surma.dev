import { copyRegexp } from "./utils";
import { join } from "path";
import { parse, pack, isRenegadeFile } from "./renegade-helpers";

const defaultOpts = {
  baseDir: __dirname,
  imgTagRegexp: /<(?:img|video|source)[^>]+src=["'](?!data:)([^"'(]+)["'][^>]*>/i
};

export default function(opts = {}) {
  opts = Object.assign({}, defaultOpts, opts);
  return {
    name: "tag-plugin",
    async transform(code, _id) {
      debugger;
      if (!isRenegadeFile(code)) {
        return;
      }
      let { id, contents } = parse(code);
      contents = contents.map(async contentChunk => {
        if (contentChunk.type !== "string") {
          return contentChunk;
        }
        let remainingCode = contentChunk.value;
        const result = [];
        while (true) {
          const match = copyRegexp(opts.imgTagRegexp).exec(remainingCode);
          if (!match) {
            result.push({ type: "string", value: remainingCode });
            break;
          }
          const originalImportId = match[1];
          let importId;
          if (originalImportId.startsWith("/")) {
            importId = join(opts.baseDir, "." + originalImportId);
          } else {
            importId = await this.resolveId("./" + originalImportId, id);
          }
          if (!importId) {
            throw Error(
              `Could not resolve "${originalImportId}" imported from ${id}"`
            );
          }
          const chunkRefId = this.emitChunk(importId);

          const prefix = remainingCode.slice(0, match.index);
          const imgTag = remainingCode.slice(
            match.index,
            match.index + match[0].length
          );
          const fileNameIdx = imgTag.indexOf(originalImportId);
          remainingCode = remainingCode.slice(match.index + match[0].length);
          result.push(
            ...[
              { type: "string", value: prefix },
              { type: "string", value: imgTag.slice(0, fileNameIdx) },
              { type: "chunkRefId", chunkRefId, importId },
              {
                type: "string",
                value: imgTag.slice(fileNameIdx + originalImportId.length)
              }
            ]
          );
        }
        return result;
      });
      contents = await Promise.all(contents);
      contents = contents.flat();
      return pack(id, contents);
    }
  };
}
