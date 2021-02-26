const child_process = require("child_process");
module.exports = async function() {
  return {
    isStaging: process.env.TARGET_DOMAIN != "surma.dev",
    branch:
      process.env.BRANCH || child_process.execSync("git branch --show-current"),
    domain: `https://${process.env.TARGET_DOMAIN}`,
    github: "https://github.com/surma/surma.dev/",
    datefmt: { year: "numeric", month: "long", day: "numeric" }
  };
};
