const express        = require('express');
const mongoose       = require('mongoose');
const passport       = require('passport');
const session        = require('express-session');
const flash          = require('connect-flash');
const morgan         = require('morgan');
const cookieParser   = require('cookie-parser');
const bodyParser     = require('body-parser');
const path           = require('path');
const app            = express();
const PORT           = process.env.PORT || 8080;
const configDB       = require('./config/database.js');   // { url: 'mongodb+srv://…' }


mongoose.connect(configDB.url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✓ MongoDB connected'))
.catch((err) => {
  console.error('✗ MongoDB connection error:', err);
  process.exit(1);
});


require('./config/passport')(passport);

app.set('view engine', 'ejs');                       
app.set('views', path.join(__dirname, 'views'));     


app.use(morgan('dev'));                              
app.use(cookieParser());                             
app.use(bodyParser.urlencoded({ extended: true }));  
app.use(bodyParser.json());                          
app.use(express.static(path.join(__dirname, 'public'))); 


app.use(session({
  secret            : process.env.SESSION_SECRET ||,
  resave            : false,
  saveUninitialized : false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());                                  

require('./app/routes.js')(app, passport, mongoose);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
