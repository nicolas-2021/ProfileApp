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

const LocalStrategy = require('passport-local');

const routes = require('./routes.js');
const auth = require('./auth.js');

const { ObjectID } = require('mongodb');

const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');


const http = require('http').createServer(app);
const io = require('socket.io')(http);
io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false },
  key: 'express.sid'
}));

app.use(passport.initialize());
app.use(passport.session());

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');
 
  auth(app,myDataBase);
  routes(app,myDataBase);

  let currentUsers = 0;
  io.on('connection', socket => {
    console.log('A user has connected');
    console.log('user ' + socket.request.user.username + ' connected');
    ++currentUsers;
    io.emit('user', {username: socket.request.user.username,currentUsers,connected: true});
    socket.on('disconnect', () => {
      --currentUsers;
      io.emit('user', {username: socket.request.user.username,currentUsers,connected: false}); 
    });
    socket.on('chat message', (message) => {
      io.emit('chat message', {username: socket.request.user.username, message: message});
    })
  });
 

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
/*app*/http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
