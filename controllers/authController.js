const passport = require('passport');

exports.getLogin = (req, res) => {
  res.render('login', { message: req.flash('error') });
};

exports.postLogin = passport.authenticate('local-login', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash: true
});

exports.getRegister = (req, res) => {
  res.render('register', { message: req.flash('error') });
};

exports.postRegister = passport.authenticate('local-signup', {
  successRedirect: '/dashboard',
  failureRedirect: '/register',
  failureFlash: true
});

exports.logout = (req, res) => {
  req.logout(err => {
    if (err) console.error(err);
    res.redirect('/login');
  });
};

exports.ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  const wantsJson = req.xhr || (req.headers.accept || '').includes('application/json');
  if (wantsJson) return res.status(401).json({ msg: 'Unauthorized' });
  res.redirect('/login');
};
