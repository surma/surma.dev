const { access } = require("fs").promises;

async function exists(path) {
  return access(path)
    .then(() => true)
    .catch(() => false);
}

module.exports = { exists };
