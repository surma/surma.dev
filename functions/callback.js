const { adapter } = require("./utils/aws-to-node");
const Passport = require("passport");
const { init } = require("./utils/passport-setup");
const { chain } = require("./utils/http-helpers");
const jwt = require("jsonwebtoken");

init();
exports.handler = adapter(chain(
  (req, res) => console.log("!!!", req),
  Passport.initialize(),
  (req, res) => console.log("!!2", req),
  Passport.authenticate("github", { scope: [], session: false }),
  (req, res) => console.log("!!3", req),
  (req, res) => {
    console.log(">>", req.user);
    const claim = {
      id: req.user.id
    };
    const token = jwt.sign(claim, process.env.SURMBLOG_SECRET, {
      expiresIn: parseInt(process.env.SURMBLOG_SESSION_LENGTH)
    });
    res.send(token);
  }
));
