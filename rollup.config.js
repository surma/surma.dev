import nodeResolve from "rollup-plugin-node-resolve";
import env from "./rollup-plugins/env-plugin.js";
import contentFiles from "./rollup-plugins/content-files-plugin.js";
import { sync as rmdir } from "rimraf";
import { join } from "path";
import { config } from "dotenv";

config();

rmdir("_site");

export default {
  output: {
    dir: "_site",
    format: "esm"
  },
  plugins: [
    nodeResolve(),
    env(),
	contentFiles({
		input: 'content/**/*.md'
	}),
  ]
};
