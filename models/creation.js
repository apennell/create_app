"use strict";
module.exports = function(sequelize, DataTypes) {
  var Creation = sequelize.define("Creation", {
    
    // contribution title
    title: DataTypes.STRING,

    //contribution content
    content: DataTypes.TEXT,

    // contribution prompt
    prompt: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // Creation association with User table
        this.belongsTo(models.User);
      }
    }
  });
  return Creation;
};