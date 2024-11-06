const mongoose = require('mongoose');
  const worksheetSchema = new mongoose.Schema({
      title: String,
      description: String,
      link: String,
      level: String,
  });
  
const Worksheet = mongoose.model('Worksheet', worksheetSchema);
module.exports = Worksheet;
    