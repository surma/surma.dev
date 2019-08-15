const { adapter } = require("./utils/aws-to-node");
const Passport = require("passport");
const { init } = require("./utils/passport-setup");
const { runMiddleware } = require("./utils/http-helpers");

init();
exports.handler = adapter(async (req, res) => {
  console.log("running");
  await runMiddleware(req, res, Passport.authenticate("github", { scope: [] }));
  console.log("done");
  console.log(req.user);
  res.send("OK");
});
