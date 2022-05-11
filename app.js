const express = require('express');
const ejs = require('ejs');
const PORT = process.env.PORT || 3000

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render('home')
});

app.get('/login', (req, res) => {
    res.render('login')
});

app.get('/register', (req, res) => {
    res.render('register')
});

app.listen(PORT, () => {
    console.log('Server running on ' + PORT)
});