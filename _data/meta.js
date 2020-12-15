module.exports = async function() {
  return {
    isStaging: process.env.TARGET_DOMAIN != "surma.dev",
    domain: `https://${process.env.TARGET_DOMAIN}`,
    github: "https://github.com/surma/surma.dev/",
    datefmt: { year: "numeric", month: "long", day: "numeric" }
  };
};
