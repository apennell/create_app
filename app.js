var express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser'),
    db = require('./models'),
    session = require('express-session'),
    app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));

// create sessions
app.use(session({
  secret: 'super secret',
  resave: false,
  save: {
    uninitialize: true
  }
}));


// save user's data in a session
app.use('/', function(req,res,next) {
  req.login = function(user) {
    req.session.userId = user.id;
  };
  req.currentUser = function() {
    return db.User.find(req.session.userId)
      .then (function(dbUser) {
        req.userId = dbUser;
        return dbUser;
      });
  };
  req.logout = function() {
    req.session.userId = null;
    req.user = null;
  };
  next();
});

// index/front page
app.get('/', function(req,res) {
  res.render('site/index.ejs');
});

// login view route
app.get('/login', function (req, res) {
  req.currentUser().then(function(user) {
    if (user) {
      res.redirect('/profile');
    } else {
      res.render('users/login');
    }
  });
});

// sign up page
app.get('/signup', function (req, res) {
  res.render('users/signup');
});

// show user
app.get('/profile', function(req,res){
  req.currentUser().then(function(dbUser) {
    if (dbUser) {
      res.render('users/profile', {ejsUser: dbUser});
    } else {
      res.redirect('/login');
    }
  });
});

// login route
app.post('/login', function (req, res) {
  console.log(req.body.email, req.body.password);

  var email = req.body.email;
  var password = req.body.password;
  db.User.authenticate(email, password)
    .then(function(dbUser) {
      if (dbUser) {
        req.login(dbUser);
        res.redirect('/profile');
      } else {
        res.redirect('/login');
      }
    });
});

// for user to submit sign-up form
app.post('/signup', function(req,res){
  var email = req.body.email;
  var password = req.body.password;
  var username = req.body.username;
  var name = req.body.name;
  var location = req.body.location;
  db.User.createSecure(email, password, username, name, location)
    .then(function(user){
      res.redirect('/profile');
    });
});

// log out
app.delete('/logout', function(req,res){
  req.logout();
  res.redirect('/login');
});

app.listen(3000, function () {
  console.log("SERVER RUNNING");
});