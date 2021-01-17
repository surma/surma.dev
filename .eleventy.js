const syntaxhighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
require("prismjs/components");

const markdownIt = require("markdown-it");
const markdownItKatex = require("./plugins/markdown-it-katex");
const options = {
  html: true,
};
const markdownLib = markdownIt(options).use(markdownItKatex);
// Would you like some race conditions with your wine?
let geometry;
import("./static/lab/diagram/geometry.mjs").then(m => geometry = m);

module.exports = function(config) {
  // Copy /static to /
  config.addPassthroughCopy({ 
    static: "/"
  });
  config.setLibrary("md", markdownLib);
  config.addPlugin(syntaxhighlight);
  config.addMarkdownHighlighter((str, lang) => {
    if(lang !== "geometry") {
      return;
    }
    const geometryDescriptor = (new Function("geometry", `return (${str})`))(geometry);
    // const uid = Array.from({l})
    return `
      ${geometry.renderToString(geometryDescriptor)}
      <script type="module">
        import * as geometry from "/lab/diagram/geometry.mjs";
        const descriptor = ${str};
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
