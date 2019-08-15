const { adapter } = require("./utils/aws-to-node");
const Passport = require("passport");
const { init } = require("./utils/passport-setup");

init();
exports.handler = adapter(Passport.authenticate("github", { scope: [] }));
