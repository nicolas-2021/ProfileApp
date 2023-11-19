require('dotenv').config();
const passport = require('passport');
const { ObjectID } = require('mongodb');
const LocalStrategy = require('passport-local');
const GitHubStrategy = require('passport-github').Strategy;
module.exports = function (app, myDataBase) {
passport.serializeUser((user, done) => {
    done(null, user._id);
});
      
passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
        done(null, doc);
    });
});

//midleware que se activa al llamar al 'passport.authenticate'; Sucede en el login(al principio, pues ya existe el usuario) y en el register(despues de insertar el usuario).
passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`);
      if (err) return done(err);
      if (!user) return done(null, false);
      const hash = bcrypt.hashSync(user.password, 12);
      if (!bcrypt.compareSync(hash, user.password)) { 
        return done(null, false);
      }
      //if (password !== user.password) return done(null, false);
      return done(null, user);
    });
}));

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/github/callback/'
},
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    myDataBase.findOneAndUpdate(
      { id: profile.id },
      {
        $setOnInsert: {
          id: profile.id,
          username: profile.username,
          name: profile.displayName || 'John Doe',
          photo: profile.photos[0].value || '',
          email: Array.isArray(profile.emails)
            ? profile.emails[0].value
            : 'No public email',
          created_on: new Date(),
          provider: profile.provider || ''
        },
        $set: {
          last_login: new Date()
        },
        $inc: {
          login_count: 1
        }
      },
      { upsert: true, new: true },
      (err, doc) => {
        return cb(null, doc.value);
      }
    );
    //Database logic here with callback containing your user object
  }
));

}