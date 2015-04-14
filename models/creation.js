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
        // associations can be defined here
        this.belongsTo(models.User);
        // this.belongsTo(models.Prompt);
      }
    }
  });
  return Creation;
};