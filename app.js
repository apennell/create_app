var express = require('express');
var app = express();
var request = require('request');
var db = require('./models');
var bodyParser = require('body-parser');
var session = require('express-session');
var methodOverride = require('method-override');

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));

// create sessions
app.use(session({
  secret: 'super secret',
  resave: false,
  save: {
    uninitialize: true
  }
}));

// var to hide api key
var env = process.env;
var api_key = env.WORDNIK_API_KEY;

// save user's data in a session
app.use('/', function(req,res,next) {
  req.login = function(user) {
    // set value on session.userId
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

app.use(methodOverride('_method'));

app.use(express.static('public'));

// index/front page
app.get('/', function(req,res) {
  // Word of the Day API
  request('http://api.wordnik.com:80/v4/words.json/wordOfTheDay?api_key=' + api_key, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var jsonData = JSON.parse(body);
      res.render("site/index", {jsonData: jsonData});
    }
  });
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

app.get('/creations', function(req,res) {
  // find all the articles
  db.Creation.all().then(function(creations) {
    // render the article index template with articlesList, containing articles
    res.render('creations/index', {creationsList: creations});
  });
});

app.get('/creations/new', function(req,res) {
  req.currentUser().then(function(dbUser) {
    if (dbUser) {
      res.render('creations/new');
    } else {
    res.redirect('/login');
    }  
  });
});

app.post('/creations', function(req,res) {
  db.Creation.create(req.body.creation)
    .then(function(creation) {
      res.redirect('/creations');
    });
});

app.listen(3000, function () {
  console.log("SERVER RUNNING");
});