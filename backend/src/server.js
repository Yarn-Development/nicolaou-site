const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
require("dotenv").config();
const app = express();
const PORT = 5000;

// Connect to MongoDB
mongoose.connect("mongodb+srv://admin:FYF8LrFw5RiqEd7h@nicoloau-site.vz2id.mongodb.net/?retryWrites=true&w=majority&appName=Nicoloau-Site", {
  useNewUrlParser: true,
});

// Define Video schema
const videoSchema = new mongoose.Schema({
  title: String,
  description: String,
  link: String,
  level: String,
});
// Worksheet Schema and Upload Logic 

const worksheetSchema = new mongoose.Schema({
    title: String,
    description: String,
    link: String,
    level: String,
    });

const Video = mongoose.model('Video', videoSchema);
const Worksheet = mongoose.model('Worksheet', worksheetSchema);

// Middleware for parsing JSON
app.use(express.json());

// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Upload video endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
  const { title, description, level } = req.body;
  const link = `/uploads/${req.file.filename}`;

  const newVideo = new Video({ title, description, link, level });
  await newVideo.save();

  res.json(newVideo);
});

// Fetch videos endpoint
app.get('/videos', async (req, res) => {
  const videos = await Video.find();
  res.json(videos);
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend/public')));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
module.exports = app;