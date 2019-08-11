const syntaxhighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
require("prismjs/components");
const previewImg = require("./11ty-plugins/preview-img");

module.exports = function(config) {
  config.addPassthroughCopy({ assets: "/" });
  config.addPlugin(syntaxhighlight);
  config.addPlugin(previewImg);

  return {
    dir: {
      input: "content",
      output: ".tmp",
      includes: "../_includes",
      data: "../_data"
    }
  };
};
