const child_process = require("child_process");
module.exports = async function() {
  return {
    isStaging: process.env.TARGET_DOMAIN != "surma.dev",
    branch:
      process.env.BRANCH || child_process.execSync("git branch --show-current"),
    domain: `https://${process.env.TARGET_DOMAIN}`,
    github: "https://github.com/surma/surma.dev/",
    datefmt: { year: "numeric", month: "long", day: "numeric" },
    postit: "PostIt Notes are blog posts that do not aim to be complete or thorough, which often have a short half-life and where I'll assume way more prior knowledge than usual. They mostly exist to document an interesting fact, API or process that I encountered."
  };
};
