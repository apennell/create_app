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
    // sets current user
    return db.User.find(req.session.userId)
      .then (function(dbUser) {
        req.userId = dbUser;
        return dbUser;
      });
  };
  req.logout = function() {
    // returns session's userId and user back to null for logout
    req.session.userId = null;
    req.user = null;
  };
  next();
});

app.use(methodOverride('_method'));

app.use(express.static(__dirname + '/public'));

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
      // if the user exists, redirect to their profile
      res.redirect('/profile');
    } else {
      // if there was a login error, redirect back to login page
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

// show user's profile page
app.get('/profile', function(req,res){
  req.currentUser()
    .then(function(dbUser) {
    if (dbUser) {
      // if there's a user logged in, render their profile page
      db.Creation.findAll({where: {UserId: dbUser.id}})
      .then(function(creations) {
        // get the user info and their creations 
        res.render('users/profile', {ejsUser: dbUser, creationsList: creations});
          });
    } else {
      // if there isn't a user logged in, redirect to the login page
      res.redirect('/login');
    }
  });
});

// login route
app.post('/login', function (req, res) {
  //set necessary variables to their equivalents in the form's input field
  var email = req.body.email;
  var password = req.body.password;
  
  // authenticate email and password
  db.User.authenticate(email, password)
    .then(function(dbUser) {
      if (dbUser) {
        // if no errors, redirect to profile
        req.login(dbUser);
        res.redirect('/profile');
      } else {
        //if an error, redirect back to login
        res.redirect('/login');
      }
    });
});

// for user to submit sign-up form
app.post('/signup', function(req,res){
  //set necessary variables to their equivalents in the form's input field
  var email = req.body.email;
  var password = req.body.password;
  var username = req.body.username;
  var name = req.body.name;
  var location = req.body.location;
  
  // run creation of user account
  db.User.createSecure(email, password, username, name, location)
    .then(function(user){
      if(user.errors) {
        // if there are errors in the form, redirect back to signup page and display relevant error messages
        res.redirect('/signup?err='+user.errors.join(":"));
      } else {
        // if no errors, form's input is passed into variables, which are added to the User table in the db, and user is redirected to their profile page
        res.redirect('/profile');
      }
    });
});

// log out
app.delete('/logout', function(req,res){
  req.logout();
  res.redirect('/login');
});

// show creations index page that lists all contributions
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

// post new creation to creation db
app.post('/creations', function(req,res) {
  // set creation var to input from the form
  var creation = req.body.creation;
  // set the UserId field in Creation table to the current session's user id
  creation.UserId = req.session.userId;
  
  // add new creation to Creation table in db
  db.Creation.create(creation)
    .then(function(creation) {
      // redirect to creation main page
      res.redirect('/creations');
    });
});

// show individual creation page
app.get('/creations/:id', function(req, res) {
  // finds creations in the Creation table by its id number; also gets user info to display
  db.Creation.find({where: {id: req.params.id}, include: db.User})
    .then(function(creation) {
      // get creation for rendering
      res.render('creations/creation', {
        creationToDisplay: creation});
    });
});

// show creators index page with all creators
app.get('/creators', function(req, res) {
  // finds all creators in User db to display
  db.User.findAll()
    .then(function(users) {
      // get all the users from table for rendering
      res.render('creators/index', {ejsUsers: users});
    });
});

// show creator profile page with all creations and info
app.get('/creators/:id', function(req, res) {
  // finds specific user from User table based on id number; also gets creation info to display
  db.User.find({where: {id: req.params.id}, include: db.Creation})
    .then(function(user) {
      // get creation for rendering
      res.render('creators/creator.ejs', {ejsUser: user});
    });
});

// set server listening port
app.listen(process.env.PORT || 3000, function () {
  console.log("SERVER RUNNING");
});