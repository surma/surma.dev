module.exports = {
  domain: require("./staging")()
    ? "https://staging.dassur.ma"
    : "https://dassur.ma",
  github: "https://github.com/surma/surma.github.io/",
  datefmt: { year: "numeric", month: "long", day: "numeric" }
};
