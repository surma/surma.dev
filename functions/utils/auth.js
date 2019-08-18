const { verify } = require("jsonwebtoken");
function requiresAuth(h) {
  return async (event, ...args) => {
    if (!event.headers.authorization) {
      return {
        statusCode: 403,
        body: ""
      };
    }
    const header = event.headers.authorization.split(" ")[1];
    try {
      const token = verify(header, process.env.SURMBLOG_SECRET);
      event.authToken = token;
    } catch (e) {
      return {
        statusCode: 403,
        body: ""
      };
    }
    return await h(event, ...args);
  };
}

module.exports = { requiresAuth };
