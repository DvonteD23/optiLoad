const LocalStrategy = require('passport-local').Strategy;
const bcrypt        = require('bcryptjs');
const User          = require('../models/User');

module.exports = function (passport) {

  //login
  passport.use('local-login',
    new LocalStrategy(
      { usernameField: 'email', passReqToCallback: false },
      async (email, password, done) => {
        try {
          const user = await User.findOne({ email: email.toLowerCase() });
          if (!user) {
            return done(null, false, { message: 'Email not registered' });
          }
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: 'Incorrect password' });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  //signup
  passport.use('local-signup',
    new LocalStrategy(
      { usernameField: 'email', passReqToCallback: true },
      async (req, email, password, done) => {
        try {
          if (await User.exists({ email: email.toLowerCase() }))
            return done(null, false, { message: 'Email already in use' });

          const hash = await bcrypt.hash(password, 12);

          //build fullName for the required `name` field
          const fullName = `${req.body.firstName} ${req.body.lastName}`.trim();

          const newUser = await User.create({
            name          : fullName,
            firstName     : req.body.firstName,
            lastName      : req.body.lastName,
            email         : email.toLowerCase(),
            password      : hash,
            company       : req.body.company,
            vehicleType   : req.body.vehicleType,
            vehicleLength : req.body.vehicleLength
          });

          return done(null, newUser);
        } catch (err) { return done(err); }
      })
  );

  //session serialization
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) =>
    User.findById(id).then(u => done(null, u)).catch(done)
  );
};
