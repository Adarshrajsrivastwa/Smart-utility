let express = require('express');
let session = require('express-session');
let passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
let connectdb = require('./config/db');
const User = require('./models/usermodels');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const twilio = require('twilio');

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

app.get('/', async (req, res) => {
  res.render('index');
});

const accountSid = process.env.TWILIO_ACCOUNT_SID;  // Account SID from .env file
const authToken = process.env.TWILIO_AUTH_TOKEN;    // Auth Token from .env file
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;  // Twilio phone number from .env file

const client = new twilio(accountSid, authToken);

app.use(bodyParser.json());

// Function to send SMS
function sendBookingConfirmation(toPhoneNumber) {
    client.messages
        .create({
            body: 'Your booking is confirmed!',
            from: 6205840092,  // Use Twilio phone number from .env
            to: toPhoneNumber
        })
        .then((message) => console.log('Message sent: ', message.sid))
        .catch((error) => console.error('Error: ', error));
}
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

  app.get('/booking',isAuthenticated,(req, res) => {
    res.render('form');
  })

  function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();  // If user is authenticated, proceed to the route handler
    }
    res.redirect('/login');  // Redirect to login page if not authenticated
  }

  app.post('/send-confirmation', (req, res) => {
    const phoneNumber = req.body.phone; 


    if (phoneNumber) {
        sendBookingConfirmation(phoneNumber);  // Call function to send SMS
        res.status(200).json({ message: 'Booking confirmation sent' });  // Send success response
    } else {
        res.status(400).json({ error: 'Phone number is required' });  // If phone number not provided
    }
});
  

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});