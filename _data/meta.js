module.exports = async function() {
  const isStaging = await require("./staging")();
  return {
    domain: isStaging ? "https://staging.surma.dev  " : "https://surma.dev",
    github: "https://github.com/surma/surma.github.io/",
    datefmt: { year: "numeric", month: "long", day: "numeric" }
  };
};
