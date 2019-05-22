import html from "./rollup-plugins/html.js";

export default {
  input: ["_site/index.html"],
  output: {
    dir: "_dist",
    format: "esm",
    entryFileNames: "[name].html"
  },
  plugins: [
    html()
  ]
}