import html from "./rollup-plugins/html.js";
import css from "./rollup-plugins/css.js";

export default {
  input: ["_site/index.html"],
  output: {
    dir: "_dist",
    format: "esm",
    entryFileNames: "[name].html",
    // We’d need this, tbqh
    // entryFileNames: "[name].[ext]",
    // chunkFileNames: "[name]-[hash].[ext]"
  },
  plugins: [
    html(),
    css()
  ]
}