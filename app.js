require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const PORT = process.env.PORT || 3000
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.use(session({ // first use session package, set it up with initial configuration
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize()); // tell app to use passport to intialize the passport package
app.use(passport.session()); // use passport to deal with the sessions

mongoose.connect('mongodb://localhost:27017/userDB', { useNewUrlParser: true });

var userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

// hash and salt passwords and to save to mongoDB db
userSchema.plugin(passportLocalMongoose); // tap into userSchema. in order for it to have a plugin, it must be a mongoose schema
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id)
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user)
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    (accessToken, refreshToken, profile, cb) => {
        console.log(profile)
        User.findOrCreate({ googleId: profile.id }, (err, user) => {
            return cb(err, user);
        });
    }
));

passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID_FB,
    clientSecret: process.env.CLIENT_SECRET_FB,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    userProfileURL: "http"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ facebookId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.get('/', (req, res) => {
    res.render('home')
});

// use passport to authenticate our user using google strategy which is setup above (passing in .env files so google recognizes our application), and then when we hit up google tell them we want the user's profile (includes email, id)
app.route('/auth/google')
    .get(passport.authenticate('google', { // use google strategy
        scope: ['profile']
    }))

app.get('/auth/google/secrets', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/secrets');
})

app.route('/auth/facebook')
    .get(passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
        res.redirect('/secrets');
    })

app.get('/login', (req, res) => {

    res.render('login')
});

app.get('/register', (req, res) => {
    res.render('register')
});

app.get('/secrets', (req, res) => {
    User.find({ "secret": { $ne: null } }, (err, foundUsers) => {
        if(err) {
            console.log(err)
        } else {
            if(foundUsers) {
                res.render('secrets', {usersWithSecrets: foundUsers});
                console.log(foundUsers);
            }
        }
    });
});

app.get('/submit', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('submit');
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/')
});

app.post('/register', (req, res) => {

    User.register({ username: req.body.username }, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect('/register')
        } else { // creating a session to authenticate to see if they're already logged in which will automatically direct to the /secrets route
            passport.authenticate('local')(req, res, () => { // this callback only gets triggered if the authentication is triggered || use local strategy
                res.redirect('/secrets');
            })
        }
    })

});

app.post('/login', (req, res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err) => {
        if (err) {
            console.log(err)
        } else {
            passport.authenticate('local')(req, res, () => {
                res.redirect('/secrets');
            });
        }
    });
});

app.post('/submit', (req, res) => {
    const submittedSecret = req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id, (err, foundUser) => {
        if (err) {
            console.log(err)
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(() => {
                    res.redirect('/secrets')
                });
            }
        }
    });
});

app.listen(PORT, () => {
    console.log('Server running on ' + PORT)
});