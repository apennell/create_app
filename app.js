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

app.use(express.static('public/LRodu103T8'));

// index/front page
app.get('/', function(req,res) {
  // Word of the Day API
  request('http://api.wordnik.com:80/v4/words.json/wordOfTheDay?api_key=' + api_key, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var jsonData = JSON.parse(body);
      console.log(jsonData);
      res.render("site/index.ejs", {jsonData: jsonData});
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

  // Define a variable error to be either an error that was passed as a query parameter, or false.
  var err = req.query.err || false;

  // Render the signup page and pass the value set to err.
  if(err !== false) {
    res.render('users/signup', { err: err.split(":") });
  } else {
    res.render('users/signup', { err: false});
  }
});

// show user
app.get('/profile', function(req,res){
  req.currentUser()
    .then(function(dbUser) {
    if (dbUser) {
      db.Creation.findAll({where: {UserId: dbUser.id}})
      .then(function(creations) {          
        res.render('users/profile', {ejsUser: dbUser, creationsList: creations});
          });
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
      // If user is string, as returned from createSecure, it means there was an error and that's what was returned as user
      if(user.errors) {
        res.redirect('/signup?err='+user.errors.join(":"));
      } else {
        res.redirect('/profile');
      }
    });
});

// log out
app.delete('/logout', function(req,res){
  req.logout();
  res.redirect('/login');
});

app.get('/creations', function(req,res) {
  // find all the creations
  db.Creation.findAll(
    {include: [db.User]})
    .then(function(creations) {
    // render the article index template with articlesList, containing articles
    res.render('creations/index', {creationsList: creations});
    });
});

// new creation page
app.get('/creations/new', function(req,res) {
  db.User.all().then(function(user) {
    req.currentUser().then(function(dbUser) {
      // if user is logged in, render new creation page
      if (dbUser) {
        res.render('creations/new', {
          Users: user});
      } else {
        // redirect to login page if user isn't logged in
        res.redirect('/login');
      }  
    });
  });
});

// post creation to creation db
app.post('/creations', function(req,res) {
  var creation = req.body.creation;
  creation.UserId = req.session.userId;
  db.Creation.create(req.body.creation)
    .then(function(creation) {
      console.log(creation);
      // redirect to creation main page
      res.redirect('/creations');
    });
});

// // show individual contribution page
app.get('/creations/:id', function(req, res) {
  db.Creation.find({where: {id: req.params.id}, include: db.User})
    .then(function(creation) {
      res.render('creations/creation', {
        creationToDisplay: creation});
    });
});

// show creators index page with all creators
app.get('/creators', function(req, res) {
  db.User.findAll({include: [db.Creation]})
        .then(function(users) {
            res.render('creators/index', {ejsUsers: users});
    });
});

// show creator profile page with all creations and info
app.get('/creators/:id', function(req, res) {
  db.User.find({where: {id: req.params.id}, include: db.Creation})
    .then(function(user) {
      res.render('creators/creator', {ejsUser: user});
    });
});

app.listen(process.env.PORT || 3000, function () {
  console.log("SERVER RUNNING");
});