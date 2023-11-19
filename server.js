'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require('express-session');
const passport = require('passport');
const routes = require('./routes.js');
const auth = require('./auth.js');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

passport.initialize();
passport.session();

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');
  auth(app,myDataBase);
  routes(app,myDataBase);

  // Be sure to change the title

  // Serialization and deserialization here...

  app.use((req, res, next) => {
    res.status(404)
    .type('text')
    .send('Not Found');
  });
  // Be sure to add this...
}).catch(e => {
  app.route('/').get((req, res) => {
    app.set('view engine', 'pug');
    app.set('views', './views/pug');
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});
// app.listen out here...


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
