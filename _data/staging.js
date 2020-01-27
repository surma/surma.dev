module.exports = async function() {
  if (typeof process.env.LOCAL_DEV === "string") {
    return true;
  }
  if (process.env.BRANCH !== "master") {
    return true;
  }
  return false;
};
