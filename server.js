const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');

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

const localStrategy =  new LocalStrategy((username, password, done) => {
  (async() => {
    try {
        const params = { username, password };

        // Find and authenticate user based on `username` and `password`
        let user = await PlutoServices.US.isValidUserCredentials(params);
        if (user) {
            user = Object.assign({}, user);
            delete user.password; //remove password from result
    
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

const localAuth = passport.authenticate('local', { session: false, failWithError: true });
app.post('/api/login', localAuth, (req, res) => {
  const options = { expiresIn: '1d' };
  const payload = { user: req.user[0] };
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

const authorizeUser = passport.authenticate('jwt', { session: false, failWithError: true });



// Anything that doesn't match the above, send back index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/client/index.html'))
});

app.use('/api/user/groups', authorizeUser, require('./controllers/GroupController'));
app.use('/api/posts', authorizeUser, require('./controllers/PostController'));
app.use('/api/user', require('./controllers/UserController'));
app.use('/api/public', require('./controllers/PublicController'));




app.listen(port, () => console.log(`Server runnning on port ${port}!`));
