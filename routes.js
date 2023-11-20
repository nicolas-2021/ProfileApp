const passport = require('passport');
const bcrypt = require('bcrypt');//para implementar Hashs
const { ObjectID } = require('mongodb');
const LocalStrategy = require('passport-local');
module.exports = function (app, myDataBase) {
app.route('/').get((req, res) => {
    app.set('view engine', 'pug');
    app.set('views', './views/pug');
    res.render('index', { title: 'Connected to Database', message: 'Please login', showLogin: true, showRegistration: true, showSocialAuth: true });
});

app.route('/login').post(passport.authenticate('local',{ failureRedirect: '/' }),
  (req,res)=>{
    //app.set('view engine', 'pug');
    //res.redirect('/profile').render('profile', { username: req.user.username});
    res.redirect('/profile');
});

//req.user guarda la informacion si el usuario se registra correctamente.
//Cualquiera podria intentar ir a /profile desde el navegador y eso hay que impedirlo por seguridad.
//Eso se hace pasando un midleware como primer argumento de un get a esa ruta :
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
};

app.route('/profile').get(ensureAuthenticated,(req,res)=>{
    //res.redirect('/profile');
    res.render('profile', { username: req.user.username});
});

app.route('/logout').get((req,res)=>{
    req.logout();
    res.redirect('/');
});

//Por convencion el registro y el loggin se hacen de esta manera :
//para /register: accedemos a la informacion ingresada mediante req.body y autenticamos en el ultimo argumento(pues primero hay que insertarnos)
//para /login: si queremos, accedemos con req.user a la info ingresada; y autenticamos en el primer argumento (pues ya nos habiamos registrado)
app.route('/register')
.post((req, res, next) => {
  const hash = bcrypt.hashSync(req.body.password, 12);
  myDataBase.findOne({ username: req.body.username }, (err, user) => {
    if (err) {
      next(err);
    } else if (user) {
      res.redirect('/');
    } else {
      myDataBase.insertOne({
        username: req.body.username,
        password: hash
      },
        (err, doc) => {
          if (err) {
            res.redirect('/');
          } else {
            // The inserted document is held within
            // the ops property of the doc
            next(null, doc.ops[0]);
          }
        }
      )
    }
  })
},
  passport.authenticate('local', { failureRedirect: '/' }),
  (req, res, next) => {
    res.redirect('/profile');
  }
);

app.route('/auth/github')
.get(passport.authenticate('github'));

app.route('/auth/github/callback')
.get(passport.authenticate('github', { failureRedirect: '/' }), (req,res) => {
    res.redirect('/profile');
});


}