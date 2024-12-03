let express = require('express');
let session = require('express-session');
let passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
let connectdb = require('./config/db');
const User = require('./models/usermodels');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config();
let app = express();

connectdb();

app.use(express.json());

passport.use(new LocalStrategy(
  async function(username, password, done) {
    try {
      const user = await User.findOne({ username: username });

      if (!user) {
        return done(null, false); // User not found
      }

      // Password matching (considering hashed passwords)
      if (user.password !== password) {
        return done(null, false); // Password mismatch
      }

      return done(null, user); // User authenticated successfully

    } catch (err) {
      return done(err); // Handle any errors that occur during the database query
    }
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id); // Use await to get the user by ID
    done(null, user); // If user is found, pass it to the done callback
  } catch (err) {
    done(err, null); // If an error occurs, pass it to the done callback
  }
});

app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'secretcode', 
  resave: false,
  saveUninitialized: false,
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS as the view engine
app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
  res.render('index');
});

app.get('/login', async (req, res) => {
  res.render('login');
});

app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

  app.post('/register', async (req, res) => {
    try {
      // Check if username, email, or phone already exists
      const existingUser = await User.findOne({
        $or: [{ username: req.body.username }, { email: req.body.email }, { phone: req.body.phone }]
      });
  
      if (existingUser) {
        return res.status(400).send('Username, Email, or Phone number already exists.');
      }
  
      // Ensure that all required fields are provided
      if (!req.body.phone) {
        return res.status(400).send('Date of birth and phone number are required.');
      }
  
      // Create new user object with username, email, dob, and phone number
      const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password, 
      });
  
      // Register new user using passport-local-mongoose
      User.register(newUser, req.body.password, (err, User) => {
        if (err) {
          console.log(err);
          return res.status(500).send('Error while registering user');
        }
  
        // Authenticate the user after successful registration
        passport.authenticate('local')(req, res, () => {
          res.redirect('/'); // Redirect to home page or dashboard after successful login
        });
      });
  
    } catch (err) {
      console.log(err);
      res.status(500).send('Something went wrong.');
    }
  })

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
