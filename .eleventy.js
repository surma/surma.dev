const syntaxhighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

const prism = require("prismjs");
const loader = require("prismjs/components/");
loader([
  "erlang",
  "wasm",
  "bash",
  "c",
  "cpp",
  "diff",
  "go",
  "typescript",
  "json",
  "rust",
  "jsx",
]);
// Don’t do any highlighting
prism.languages.text = {};
const markdownIt = require("markdown-it");
const markdownItKatex = require("./plugins/markdown-it-katex");
const options = {
  html: true,
};
const codediffPlugin = require("./plugins/codediff");
const geometryPlugin = require("./plugins/geometry");
const dataTablePlugin = require("./plugins/data-table");
const markdownLib = markdownIt(options)
  .use(markdownItKatex)
  .use(dataTablePlugin)
  .use(geometryPlugin)
  .use(codediffPlugin)

module.exports = function (config) {
  // Copy /static to /
  config.addPassthroughCopy({
    static: "/",
  });
  config.setLibrary("md", markdownLib);
  config.addPlugin(syntaxhighlight);
  config.addMarkdownHighlighter((str, lang) => {
    if (!lang) {
      return str;
    }
    if (lang === "geometry") {
      const geometryDescriptor = new Function("geometry", `return (${str})`)(
        geometry
      );
      const uid = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 256).toString(16)
      ).join("");
      return `
        <div id="${uid}">
        ${geometry.renderToString(geometryDescriptor)}
        </div>
        <script type="module">
          import * as geometry from "/lab/diagram/geometry.mjs";
          import * as lit from "lit1.3.0/lit-html.js";
          const descriptor = ${str};
          geometry.instantiateDiagram(descriptor, document.getElementById("${uid}"), lit);
        </script>
      `;
    }
    if (!(lang in prism.languages)) {
      throw Error(`Unknown language: ${lang}`);
    }
    try {
      return prism.highlight(str, prism.languages[lang], lang);
    } catch (e) {
      console.log(str);
      console.log(e);
    }
  });
  return {
    dir: {
      input: "content",
      output: ".tmp",
      includes: "../_includes",
      data: "../_data",
    },
  };
};
