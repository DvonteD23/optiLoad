require('dotenv').config();
const express        = require('express');
const mongoose       = require('mongoose');
const session        = require('express-session');
const flash          = require('connect-flash');
const passport       = require('passport');
const LocalStrategy  = require('passport-local').Strategy;
const bcrypt         = require('bcryptjs');
const morgan         = require('morgan');
const cookieParser   = require('cookie-parser');
const bodyParser     = require('body-parser');
const methodOverride = require('method-override');
const path           = require('path');

const userModel       = require('./models/user');
const shipmentModel   = require('./models/shipment');
const shipmentsRouter = require('./routes/shipments');
const { ensureAuth }  = require('./routes/utils');

const app  = express();
const PORT = process.env.PORT || 8080;

//Express & Views
app.set('view engine', 'ejs');
app.set('views',       path.join(__dirname, 'views'));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

//Session & Passport
app.use(session({
  secret:            process.env.SESSION_SECRET || 'optiload-secret',
  resave:            false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

//Local signup strategy
passport.use('local-signup', new LocalStrategy({
    usernameField:    'email',
    passReqToCallback: true
  },
  async (req, email, password, done) => {
    try {
      email = email.toLowerCase();
      if (await userModel.exists({ email })) {
        return done(null, false, { message: 'Email already in use' });
      }
      const hash = await bcrypt.hash(password, 12);
      const newUser = await userModel.create({
        email,
        password:      hash,
        name:          `${req.body.firstName} ${req.body.lastName}`.trim(),
        company:       req.body.company,
        vehicleType:   req.body.vehicleType,
        vehicleLength: req.body.vehicleLength,
        balance:       0
      });
      done(null, newUser);
    } catch (err) {
      done(err);
    }
  }
));

//Local login strategy
passport.use('local-login', new LocalStrategy({
    usernameField: 'email'
  },
  async (email, password, done) => {
    try {
      email = email.toLowerCase();
      const user = await userModel.findOne({ email });
      if (!user) {
        return done(null, false, { message: 'Email not registered' });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: 'Incorrect password' });
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const u = await userModel.findById(id);
    done(null, u);
  } catch (err) {
    done(err);
  }
});

//Auth routes
app.get('/login',    (req, res) => res.render('login',    { message: req.flash('error') }));
app.post('/login',   passport.authenticate('local-login', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash:    true
}));
app.get('/register', (req, res) => res.render('register', { message: req.flash('error') }));
app.post('/register',passport.authenticate('local-signup', {
  successRedirect: '/dashboard',
  failureRedirect: '/register',
  failureFlash:    true
}));
app.get('/logout',   (req, res) => {
  req.logout(err => { if (err) console.error(err); });
  res.redirect('/login');
});

//Dashboard
app.get('/dashboard', ensureAuth, (req, res) => {
  res.render('dashboard', { user: req.user });
});

//Mount shipments API
console.log('shipmmentsAPI connected');
app.use('/api/shipments', ensureAuth, shipmentsRouter);

//Transit screen
app.get('/transit/:id', ensureAuth, async (req, res) => {
  try {
    const shipment = await shipmentModel.findById(req.params.id);
    if (!shipment || shipment.assignedTo.toString() !== req.user.id) {
      return res.redirect('/dashboard');
    }
    res.render('transit', { load: shipment, user: req.user });
  } catch (err) {
    console.error('Transit route error:', err);
    res.redirect('/dashboard');
  }
});

// Update user balance
app.put('/api/users/balance', ensureAuth, async (req, res) => {
  try {
    let amount = parseFloat(req.body.amount);
    if (isNaN(amount)) {
      return res.status(400).json({ msg: 'Invalid amount' });
    }
    req.user.balance = (req.user.balance || 0) + amount;
    await req.user.save();
    res.json({ balance: req.user.balance });
  } catch (err) {
    console.error('Balance update error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

//Catch-all → Redirect to Login
app.use((req, res) => res.redirect('/login'));

//Connect MongoDB, seed shipments, then listen
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected to:', mongoose.connection.name);

    // placeholder data definitions
    const LENGTH_LIMITS = { 14:3500, 16:4000, 20:4500, 26:12000 };
    const carriers   = ['Acme Transport','Global Freight Co.','Rapid Haul Ltd.','Express Logistics'];
    const commodities= ['Electronics','Furniture','Apparel','Automotive','Food'];
    const lengths    = Object.keys(LENGTH_LIMITS).map(Number);

    // compute how many shipments we *expect*
    const expectedCount = carriers.length * commodities.length * lengths.length;

    // see how many actually exist
    const count = await shipmentModel.countDocuments();
    console.log('Existing shipment count:', count, '/', expectedCount);

    if (count < expectedCount) {
      console.log('Generate new test shipments');
      // clear old
      await shipmentModel.deleteMany({});

      // build bulk
      const bulk = [];
      carriers.forEach(c => {
        commodities.forEach(comm => {
          lengths.forEach(len => {
            bulk.push({
              shippingCompany: c,
              commodity:       comm,
              loadLength:      len,
              loadWeight:      Math.floor(Math.random()*LENGTH_LIMITS[len]) + 1,
              distance:        Math.floor(Math.random()*951) + 50,
              rate:            Number((Math.random()*4 + 1).toFixed(2)),
              status:          'available',
              assignedTo:      null,
              createdAt:       new Date()
            });
          });
        });
      });

      await shipmentModel.insertMany(bulk);
      console.log(`Test ${bulk.length} placeholder shipments`);
    } else {
      console.log('Test shipments loaded in database');
    }

    app.listen(PORT, () =>
      console.log(`✓ Server active on http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
