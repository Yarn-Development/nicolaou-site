require('dotenv').config({path: __dirname + '/.env'});
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = 5000;
const fs = require('fs');

const user = require('./models/User');
const Video = require('./models/Video');
const Worksheet = require('./models/Worksheet');

// Connect to MongoDB

//broken, needs repairs
mongoose.connect("mongodb+srv://yarn:hyenaadmin@nicoloau-site.vz2id.mongodb.net/main?retryWrites=true&w=majority&appName=Nicoloau-Site", {
  useUnifiedTopology: true,
});


// warming up, hello secrets
console.log('Google Client ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID);
console.log('JWT Secret:', process.env.JWT_SECRET);
console.log('Refresh Secret:', process.env.REFRESH_SECRET);

// Middleware for parsing JSON
app.use(express.json());

// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({storage});

// ==== Uploading data ====

// Upload video endpoint
app.post('/upload', upload.single('video'),
  async (req, res) => {

  try {
  const { title, description, level } = req.body;
  const link = `/uploads/videos/${req.file.filename}`;
  const newVideo = new Video({
    title, description, link, level
  });
  await newVideo.save();
  res.status(200).json({
    message: 'Video uploaded successfully',
    filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading image: ', error.message);
    res.status(500).json({error:'Error uploading video'});
  }
});

// upload PDF endpoint
app.post('/upload', upload.single('PDF'),
  async (req, res) => {

  try {
    const fileName = req.file.filename;
    const { title, description, level } = req.body;
    const link = `/uploads/worksheets/${req.file.filename}`
    const newSheet = new Worksheet({
      title, description, link, level
    });
    await newSHeet.save();
    res.status(200).json({
      message:'Worksheet uploaded successfully',
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading Worksheet: ', error.message);
    res.status(500).json({error:'Error uploading worksheet'});
  }
});

// Upload image endpoint
app.post('/upload', upload.single('image'),
  async (req, res) => {

  try {
    const imageBuffer = req.file.buffer;
    const imagePath = `/uploads/${req.file.filename}`;
    fs.writeFileSync(imagePath, imageBuffer);

    res.status(200).json({
      message: 'Image uploaded successfully',
      filename: req.file.filename
    })

  } catch (error) {
    console.error('Error uploading image: ', error.message);
    res.status(500).json({error:'Error uploading image'});
  }
});

// ==== Fetching endpoints ====

// users endpoint
app.get('/users',
  async (req, res) => {

  const users = await User.find();
  console.log(users);
  res.json(users);
})

// videos endpoint
app.get('/videos',
  async (req, res) => {

  const videos = await Video.find();
  console.log(videos);
  res.json(videos);
});

// worksheets endpoint
app.get('/worksheet',
  async (req, res) => {

  const worksheets = await Worksheet.find();
  console.log(worksheets);
  res.json(worksheets);
})

// ==== Fetching data ====

// sending worksheet
app.post('/GetWorksheet',
  (req, res) => {

  try {
    const id = req.id;
    const sheetPath = path.join(__dirname+'/uploads/worksheets/',id,'.pdf');
    fs.readFile(sheetPath, function (err, data) {
      res.contentType('application/pdf');
      res.send(data);
      res.status(200);
    })
  } catch (error) {
    console.error('error sending worksheet: ', error.message);
  }
});

// sending video
app.post('/GetVideo',
  (req, res) => {

  const id = req.id;
  const videoPath = path.join(__dirname,'/uploads/videos/',id,'.mp4'); // Path to your video file
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

// ==== Finalisation ====

// Login endpoint
require('./routes/login')(app);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend/public')));

// ==== Debug ====

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
// Hello world

// Demo PDF tester, to affirm the server is on
app.get('/DemoPDF',
  (req,res) => {

  fs.readFile(__dirname + "/uploads/worksheets/DemoFile1.pdf" ,
    function (err,data){

    res.contentType("application/pdf");
    res.send(data);
  })
});

module.exports = app;
