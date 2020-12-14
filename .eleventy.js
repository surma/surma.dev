const syntaxhighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
require("prismjs/components");

module.exports = function(config) {
  // Copy /static to /
  config.addPassthroughCopy({ 
    static: "/"
  });
  config.addPlugin(syntaxhighlight);

  return {
    dir: {
      input: "content",
      output: ".tmp",
      includes: "../_includes",
      data: "../_data"
    }
  };
};
