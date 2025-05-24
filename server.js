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

//Passport Strategies
// Local signup
passport.use('local-signup', new LocalStrategy({
    usernameField:    'email',
    passReqToCallback: true
  },
  async (req, email, password, done) => {
    try {
      email = email.toLowerCase();
      const existing = await userModel.findOne({ email });
      if (existing) {
        return done(null, false, { message: 'Email already in use' });
      }
      const hash = await bcrypt.hash(password, 10);
      const newUser = new userModel({
        name:     req.body.name,
        email,
        password: hash,
        balance:  0
      });
      await newUser.save();
      done(null, newUser);
    } catch (err) {
      done(err);
    }
  }
));

// Local login
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

//Auth Routes
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

//Dashboard & API
app.get('/dashboard', ensureAuth, (req, res) => {
  res.render('dashboard', { user: req.user });
});
app.use('/api/shipments', ensureAuth, shipmentsRouter);
app.get('/transit/:id', ensureAuth, async (req, res) => {
  try {
    const load = await shipmentModel.findById(req.params.id).lean();
    if (!load || load.assignedTo.toString() !== req.user.id) {
      return res.redirect('/dashboard');
    }
    res.render('transit', { user: req.user, load });
  } catch (err) {
    console.error('Transit route error:', err);
    res.redirect('/dashboard');
  }
});

//Update User Balance
app.put('/balance', ensureAuth, async (req, res) => {
  try {
    const amt = Number(req.body.amount);
    req.user.balance += amt;
    await req.user.save();
    res.json({ balance: req.user.balance });
  } catch (err) {
    console.error('Balance update error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

//Catch-all
app.use((req, res) => res.redirect('/login'));

//MongoDB Connection & Unconditional Reseed
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected to:', mongoose.connection.name);

    // Carriers + delivery locations
    const carriers = [
      'Absolute Transport','Global Freight Co.','Quick Haul','Express Logistics',
      'Metro Haulers','Pioneer Logistics','Summitt County Freight',
      'Coastal Carolina Carriers','TransAtlantic Line','Frontier Shipping',
      'Liberty Trucking','Evergreen Movers','Skyline Transport','Montana Haul LLC'
    ];
    const locations = [
      { city: 'Boston',      state: 'MA' },
      { city: 'Providence',  state: 'RI' },
      { city: 'Hartford',    state: 'CT' },
      { city: 'Manchester',  state: 'NH' },
      { city: 'Albany',      state: 'NY' },
      { city: 'Portland',    state: 'ME' },
      { city: 'Burlington',  state: 'VT' },
      { city: 'Wilmington',  state: 'DE' },
      { city: 'Trenton',     state: 'NJ' },
      { city: 'Harrisburg',  state: 'PA' },
      { city: 'Richmond',    state: 'VA' },
      { city: 'Columbia',    state: 'SC' },
      { city: 'Jacksonville',state: 'FL' },
      { city: 'Baltimore',   state: 'MD' }
    ];

    const LENGTH_LIMITS = { 14:3500, 16:4000, 20:4500, 26:12000 };
    const commodities   = ['Electronics','Furniture','Apparel','Automotive','Food'];
    const lengths       = Object.keys(LENGTH_LIMITS).map(Number);

    //ALWAYS RESEED
    console.log('Deleting existing shipments and reseeding with full dataset...');
    await shipmentModel.deleteMany({});

    const bulk = [];
    carriers.forEach((company, idx) => {
      const loc = locations[idx];
      commodities.forEach(commodity => {
        lengths.forEach(len => {
          bulk.push({
            shippingCompany: company,
            commodity,
            loadLength: len,
            loadWeight: Math.floor(Math.random() * LENGTH_LIMITS[len]) + 1,
            distance:   Math.floor(Math.random() * 951) + 50,
            rate:       Number((Math.random() * 4 + 1).toFixed(2)),
            status:     'available',
            assignedTo: null,
            createdAt:  new Date(),
            city:       loc.city,
            state:      loc.state
          });
        });
      });
    });
    await shipmentModel.insertMany(bulk);
    console.log(`Inserted ${bulk.length} shipments.`);

    //Start server
    app.listen(PORT, () =>
      console.log(`Server listening at http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
