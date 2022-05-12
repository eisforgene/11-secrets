require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const PORT = process.env.PORT || 3000
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

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
    password: String
});

// hash and salt passwords and to save to mongoDB db
userSchema.plugin(passportLocalMongoose); // tap into userSchema. in order for it to have a plugin, it must be a mongoose schema

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
    res.render('home')
});

app.get('/login', (req, res) => {
    res.render('login')
});

app.get('/register', (req, res) => {
    res.render('register')
});

app.get('/secrets', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('secrets');
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/')
});

app.post('/register', (req, res) => {

    User.register({username: req.body.username}, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect('/register')
        } else { // creating a session to authenticate to see if they're already logged in which will automatically direct to the /secrets route
            passport.authenticate('local')(req, res, () => { // this callback only gets triggered if the authentication is triggered
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

app.listen(PORT, () => {
    console.log('Server running on ' + PORT)
});