import nodeResolve from "rollup-plugin-node-resolve";
import run11ty from "./rollup-plugins/11ty-plugin.js";
import startSequence from "./rollup-plugins/start-sequence-plugin.js";
import globInput from "./rollup-plugins/glob-input-input.js";
import renegade from "./rollup-plugins/renegade-plugin.js";
import emit from "./rollup-plugins/emit-plugin.js";
import tags from "./rollup-plugins/tag-plugin.js";
import passthrough from "./rollup-plugins/passthrough-plugin.js";
import copyStatic from "./rollup-plugins/copy-static.js";
import env from "./rollup-plugins/env-plugin.js";
import { sync as rmdir } from "rimraf";
import { join } from "path";
import { config } from "dotenv";

config();

rmdir("_site");
rmdir(".tmp");

const baseDir = join(__dirname, ".tmp");
export default {
  output: {
    dir: "_site",
    format: "esm"
  },
  plugins: [
    nodeResolve(),
    startSequence(),
    run11ty(),
    env(),
    globInput(".tmp/**/*.html"),
    renegade({
      extensions: ["html", "css"]
    }),
    passthrough({
      extensions: [
        "svg",
        "png",
        "jpg",
        "jpeg",
        "woff",
        "woff2",
        "eot",
        "gif",
        "mp4",
        "webm"
      ]
    }),
    emit({ baseDir }),
    tags({ baseDir }),
    copyStatic({
      // The wildcard is here for index.xml so that copy() will
      // not put it in _site/.tmp/index.xml but _site/index.xml
      src: ["static/**/*", ".tmp/*index.xml"]
    })
  ]
};
