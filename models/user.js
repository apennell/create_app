var bcrypt = require("bcrypt");
var salt = bcrypt.genSaltSync(10);

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define("User", {
    email: {
      type: DataTypes.STRING,
      // only one account per email in db
      unique: true,
      validate: {
        // matches email format
        isEmail: true,
        //min length is 6, max is 30
        len: [6, 30]
       }
    },
    passwordDigest: {
      type: DataTypes.STRING,
      validate: {
        //can't be empty
        notEmpty: true
      }
    },
    username: {
      type: DataTypes.STRING,
      validate: {
        // can't be empty
        notEmpty: true,
        // min length is 5, max is 15
        len: [5, 15]
      }
    },
    // user's real name
    name: DataTypes.STRING,
    // user's location
    location: DataTypes.STRING
  },

  {
    instanceMethods: {
      checkPassword: function(password) {
        return bcrypt.compareSync(password, this.passwordDigest);
      }
    },
    classMethods: {
      encryptPassword: function(password) {
        var hash = bcrypt.hashSync(password, salt);
        return hash;
      },
      createSecure: function(email, password, username, name, location) {

        // Define an error object in case of error.
        var error = {};
        error.errors = [];
        error.hasErrored = false;

        if (password.length < 6) {
          error.errors.push(encodeURI("Ack! Your password is too short!"));
          error.hasErrored = true;
        } 
        if (password.length > 16) {
            error.errors.push(encodeURI("Ack! Your password is too long!"));
            error.hasErrored = true;
        }
        
        var _this = this;
        return this.count( {where: {email: email}})
        .then(function(userCount) {
          if (userCount >= 1) {

            // Create variable err set to the error message and make the error message URL safe.
            error.errors.push(encodeURI("Gah! Account already exists for that email."));
            error.hasErrored = true;
          }
              
          return _this.count( {where: {username: username }})
          .then(function(usernameCount) {
            if (usernameCount >= 1) {
              error.errors.push(encodeURI("Shoot! That username is already taken!"));
              error.hasErrored = true;
            }

          // Check for errors. If error, return the error object.
            if(error.hasErrored) {
              return error;
            }

          // This actually creates the user, but we'll only get here if no errors have occurred.
          return _this.create({
            email: email,
            passwordDigest: _this.encryptPassword(password),
            username: username,
            name: name,
            location: location
          });

                
          }); // Closes the .then statement after the check for username
        }); // Closes the .then where we check for email.
        
      },
      authenticate: function(email, password) {
        // find a user in the DB
        return this.find({
          where: {
            email: email
          }
        }) 
        .then(function(user){
          if (user === null){
            throw new Error("There is no user with that email");
          }
          else if (user.checkPassword(password)){
            return user;
          }
        });
      },
      associate: function(models) {
        // associations can be defined here
        this.hasMany(models.Creation);
      },
    }
  });
  return User;
};