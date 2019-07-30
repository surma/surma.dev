import run11ty from "./rollup-plugins/11ty-plugin.js";
import startSequence from "./rollup-plugins/start-sequence-plugin.js";
import globInput from "./rollup-plugins/glob-input-input.js";
import emitChunk from "./rollup-plugins/emit-chunk-plugin.js";
import {sync as rmdir} from "rimraf";
import {join} from "path";

rmdir("_site");

export default {
  output: {
    dir: "_site",
    format: "esm"
  },
  plugins: [
    startSequence(),
    run11ty(),
    globInput(".tmp/**/*.html"),
    emitChunk({
      extension: "html",
      baseDir: join(__dirname, ".tmp")
    }),
    emitChunk({
      extension: "css",
      baseDir: join(__dirname, ".tmp")
    })
  ]
}