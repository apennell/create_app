"use strict";
module.exports = function(sequelize, DataTypes) {
  var Prompt = sequelize.define("Prompt", {
    // prompt word and definition
    word: DataTypes.TEXT,
    // date prompt was posted
    date: DataTypes.DATE
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        this.hasMany(models.Creation);
      }
    }
  });
  return Prompt;
};