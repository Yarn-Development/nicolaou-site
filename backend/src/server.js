const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Video = require('./models/Video');
const User = require('./models/User');
const Worksheet = require('./models/Worksheet');
const fs = require('fs');
require("dotenv").config();
const app = express();
const PORT = 5000;
const fs = require('fs');
const Video = require('./models/Video');
const User = require('./models/User');
const Worksheet = require('./models/Worksheet');

// Connect to MongoDB
mongoose.connect("mongodb+srv://admin:FYF8LrFw5RiqEd7h@nicoloau-site.vz2id.mongodb.net/?retryWrites=true&w=majority&appName=Nicoloau-Site", {
  useNewUrlParser: true,
});


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

// Demo PDF tester
app.get('/DemoPDF', (req,res) => {
  fs.readFile(__dirname + "/uploads/DemoFile1.pdf" , function (err,data){
    res.contentType("application/pdf");
    res.send(data);
  })
});
// Login endpoint
require('./routes/login')(app);
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend/public')));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
// Alex was here

app.post('/GetVideo', (req, res) => {
  const id = req.id;
  const videoPath = path.join(__dirname,'/uploads/',id,'.mp4'); // Path to your video file
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});


module.exports = app;
