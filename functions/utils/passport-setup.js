function init() {
  const Passport = require("passport");
  const GithubStrategy = require("passport-github");

  Passport.serializeUser(function(user, done) {
    done(null, user);
  });

  Passport.deserializeUser(function(user, done) {
    done(null, user);
  });

  Passport.use(
    new GithubStrategy(
      {
        clientID: process.env.SURMBLOG_GITHUB_APP_ID,
        clientSecret: process.env.SURMBLOG_GITHUB_APP_SECRET,
        callbackURL: `${process.env.SURMBLOG_HOST ||
          ""}/.netlify/functions/callback`
      },
      (accessToken, refreshToken, profile, cb) => {
        const user = {
          id: profile.id
        };
        return cb(null, user);
      }
    )
  );
}

module.exports = { init };
