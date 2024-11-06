const mongoose  = require('mongoose');
  const userSchema = new mongoose.Schema({
      googleId: String,
      email: String,
      name: String,
          //Maybe other fields 
  });
const User = mongoose.model('User', userSchema);
 module.exports = User;
    