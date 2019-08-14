const diff = require("array-differ");
exports.handler = async function(event) {
  return {
    statusCode: 200,
    body: JSON.stringify(diff([1, 2, 3], [1, 4, 5]))
  };
};
