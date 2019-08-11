const fs = require("fs").promises;
module.exports = async function() {
  if (typeof process.env.LOCAL_DEV === "string") {
    return true;
  }
  if (process.env.BRANCH === "staging") {
    return true;
  }
  return false;
};
