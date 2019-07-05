// loads env vars
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
const app = express();

//adds some middleware
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

// configs
const PORT = process.env.PORT || 3000;

const AWS = require('aws-sdk');

var rekognition = new AWS.Rekognition();



app.listen(PORT, () => console.log(`Video Rekogniton Application Started on Port ${PORT}`));