const syntaxhighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
require("prismjs/components");

const markdownIt = require("markdown-it");
const markdownItKatex = require("./plugins/markdown-it-katex");
const options = {
  html: true
};
const geometryPlugin = require("./plugins/geometry");
const markdownLib = markdownIt(options)
  .use(markdownItKatex)
  .use(geometryPlugin);

module.exports = function(config) {
  // Copy /static to /
  config.addPassthroughCopy({
    static: "/"
  });
  config.setLibrary("md", markdownLib);
  config.addPlugin(syntaxhighlight);
  config.addMarkdownHighlighter((str, lang) => {
    if (lang !== "geometry") {
      return;
    }
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
  });
  return {
    dir: {
      input: "content",
      output: ".tmp",
      includes: "../_includes",
      data: "../_data"
    }
  };
};
