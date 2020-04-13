const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const { fileParser } = require('express-multipart-file-parser');
const globals = require('./config/globals');

const port = process.env.PORT || 3555;
const app = express();
require('dotenv').config();


//Database configuration
const db = process.env.DB;
const mongooseOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
};

//Connect to database
mongoose.connect(db, mongooseOpts)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.log(err));

// ---
// Utilities
// ---

// Serve static files from the React frontend app
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client/')));
app.use(fileParser({
	rawBodyOptions: {
			limit: '100mb',  // Image file size limit
	}
}));


// Initialize Pluto services
const PlutoServices = require('./services/PlutoServices');
// Makes sure the services havent been initialized
if (typeof PlutoServices.init === "function") { 
    PlutoServices.init();
}


// Passport setup
const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const jwtPassport = require('passport-jwt');
const JwtStrategy = jwtPassport.Strategy;
const ExtractJwt = jwtPassport.ExtractJwt;
const jwt = require('jsonwebtoken');
app.use(passport.initialize());

const { contains } = require('./services/helpers');
const localStrategy =  new LocalStrategy((username, password, done) => {
  (async() => {
    try {
        const params = { username, password };

        // Find and authenticate user based on `username` and `password`
        let user = await PlutoServices.US.isValidUserCredentials(params);

        if (user) {
            // Fields we will store in the JSON token
            const keepFields = ['_id', 'username', 'email', 'profilePicURL', 'name', 'feedCollector', 'notificationCollector', 'friendIds'];

            // Delete all fields we dont want to keep
            Object.keys(user).forEach(key => {
              if (!contains.call(keepFields, key)) {
                delete user[key]
              }
            });

            done(null, user); // login success - sets `req.user = user`
        } else {
            done(null, false); // login failure
        }
    } catch (err) {
        done(err); // error
    }
  })();
});
passport.use(localStrategy);

const localAuth = passport.authenticate('local', { session: false, failWithError: false });
app.post('/api/login', localAuth, (req, res) => {
  const options = { expiresIn: globals.tokenExpiration };
  const payload = { user: req.user };
  const authToken = jwt.sign(payload, process.env.AUTH_SECRET, options);
  res.json({ authToken });
});

const jwtStrategy = new JwtStrategy({
  secretOrKey: process.env.AUTH_SECRET,
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer')
}, (payload, done) => {
  // The following line accepts the JWT and sets `req.user = user`
  done(null, payload.user);  // JWT is valid - sets `req.user = payload.user`
});
passport.use(jwtStrategy);

const authorizeUser = passport.authenticate('jwt', { session: false, failWithError: false });


app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.use('/api/user/groups', authorizeUser, require('./controllers/GroupController'));
app.use('/api/posts', authorizeUser, require('./controllers/PostController'));
app.use('/api/user', require('./controllers/UserController'));
app.use('/api/public', require('./controllers/PublicController'));

// Redirect to homepage if not accessing API
// If anything above doesnt hit, this will get called
app.get('/*', (req, res) => {
  res.redirect('https://site.carbonology.now.sh/');
});



app.listen(port, () => console.log(`Server runnning on port ${port}!`));
