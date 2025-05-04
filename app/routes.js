const { Router } = require('express');
const router = Router();
const ensureAuth = (req, res, next) =>
  req.isAuthenticated() ? next() : res.redirect('/login');

module.exports = (app, passport, mongoose) => {
  app.use('/', router);
  const Load = require('./models/Load')(mongoose);    
  const { Types: { ObjectId } } = mongoose;

  router.get('/', (req, res) => res.render('index.ejs'));
  router.get('/login', (req, res) =>
    res.render('login.ejs', { message: req.flash('loginMessage') })
  );

  router.post('/login',
    passport.authenticate('local-login', {
      successRedirect : '/dashboard',
      failureRedirect : '/login',
      failureFlash    : true,
    })
  );

  router.get('/signup', (req, res) =>
    res.render('signup.ejs', { message: req.flash('signupMessage') })
  );

  router.post('/signup',
    passport.authenticate('local-signup', {
      successRedirect : '/dashboard',
      failureRedirect : '/signup',
      failureFlash    : true,
    })
  );

  router.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
  });

  router.get('/dashboard', ensureAuth, async (req, res) => {
    try {
      const loads = await Load.find({ carrier: req.user.id }).lean();
      res.render('dashboard.ejs', { user: req.user, loads });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });


  router.get('/api/loads', ensureAuth, async (req, res) => {
    const loads = await Load.find({ carrier: req.user.id }).sort('-createdAt');
    res.json(loads);
  });

  router.get('/api/loads/:id', ensureAuth, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });

    const load = await Load.findOne({ _id: id, carrier: req.user.id });
    return load ? res.json(load) : res.status(404).json({ error: 'Not found' });
  });

  // Create a new load
  router.post('/api/loads', ensureAuth, async (req, res) => {
    try {
      const payload = { ...req.body, carrier: req.user.id };
      const load = await Load.create(payload);
      res.status(201).json(load);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: 'Validation failed', details: err.message });
    }
  });

  // Update a load (e.g., status changes, ETA updates)
  router.put('/api/loads/:id', ensureAuth, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });

    try {
      const load = await Load.findOneAndUpdate(
        { _id: id, carrier: req.user.id },
        req.body,
        { new: true, runValidators: true }
      );
      return load ? res.json(load) : res.status(404).json({ error: 'Not found' });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: 'Update failed', details: err.message });
    }
  });

  // Delete a load
  router.delete('/api/loads/:id', ensureAuth, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });

    const result = await Load.deleteOne({ _id: id, carrier: req.user.id });
    return result.deletedCount
      ? res.status(204).end()
      : res.status(404).json({ error: 'Not found' });
  });


  router.use((req, res) => res.status(404).render('404.ejs'));
};

