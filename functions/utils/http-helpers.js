function abortOnThrow(h) {
  return async (...args) => {
    try {
      return h(...args);
    } catch(e) {
      return {
        statusCode: 500,
        body: `Internal server error: ${e.message}`
      }
    }
  };
}

module.exports = { abortOnThrow };
