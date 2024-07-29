const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");


// initialise express app, and link to react routes
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../frontend/public")));

module.exports = app;