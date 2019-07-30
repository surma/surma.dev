import run11ty from "./rollup-plugins/11ty-plugin.js";
import startSequence from "./rollup-plugins/start-sequence-plugin.js";
import globInput from "./rollup-plugins/glob-input-input.js";
import emit from "./rollup-plugins/emit-plugin.js";
import passthrough from "./rollup-plugins/passthrough-plugin.js";
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
    passthrough({
      extensions: ["svg", "png", "jpg", "woff", "woff2", "eot"]
    }),
    emit({
      extensions: ["html", "css"],
      baseDir: join(__dirname, ".tmp")
    }),
  ]
}