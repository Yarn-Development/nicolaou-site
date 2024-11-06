const mongoose = require('mongoose');
const videoSchema = new mongoose.Schema({
    title: String,
    description: String,
    link: String,
    level: String,
});
const Video = mongoose.model('Video', videoSchema);
module.exports = Video;