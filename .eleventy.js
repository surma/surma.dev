const syntaxhighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
module.exports = function(config) {
  config.addPassthroughCopy("static");
  config.addPlugin(syntaxhighlight);

  return {
    dir: {
      input: "content",
      includes: "../_includes"
    }
  };
};