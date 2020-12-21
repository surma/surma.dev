const syntaxhighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
require("prismjs/components");

let markdownIt = require("markdown-it");
let markdownItKatex = require("./plugins/markdown-it-katex");
let options = {
  html: true,
};

let markdownLib = markdownIt(options).use(markdownItKatex);
module.exports = function(config) {
  // Copy /static to /
  config.addPassthroughCopy({ 
    static: "/"
  });
  config.addPlugin(syntaxhighlight);
  config.setLibrary("md", markdownLib);
  return {
    dir: {
      input: "content",
      output: ".tmp",
      includes: "../_includes",
      data: "../_data"
    }
  };
};
