// loads env vars
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
const app = express();

//adds some middleware
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));

// configs
const PORT = process.env.PORT || 3000;

const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-east-1'
});
export const rekognition = new AWS.Rekognition();


app.get('/', (req, res) => {
  res.send('index.html');
});
// IndexFaces End Points
app.post('/indexface', (req, res) => {

  var params = {
    CollectionId: "persons_of_interests",
    DetectionAttributes: [],
    Image: {
      S3Object: {
        Bucket: req.body.bucket_name || 'somuga-persons-of-interests',
        Name: req.body.image_name || 'mucyomiller.jpeg'
      }
    }
  };
  rekognition.indexFaces(params, (err, data) => {
    if (!err) {
      res.json(data);
    } else {
      res.json(err);
    }
  });
});

app.get('/listFaces', (req, res) => {
  var params = {
    CollectionId: 'persons_of_interests'
  };
  rekognition.listFaces(params, (err, data) => {
    if (!err) {
      res.json(data);
    } else {
      res.json({
        status: 404,
        message: 'Resource not found'
      });
    }
  });
});

app.get('/listStreamProcessors', (req, res) => {
  var params = {
    MaxResults: 10
  };
  rekognition.listStreamProcessors(params, (err, data) => {
    if (!err) {
      res.status(200).json(data);
    } else {
      res.status(404).json(err);
    }
  });
});

app.post('/startStreamProcessor', (req, res) => {
  var params = {
    Name: req.body.stream_processor_name || 'mistreamprocessor'
  };
  rekognition.startStreamProcessor(params, (err, data) => {
    if (!err) {
      res.status(200).json(data);
    } else {
      res.status(200).json(err);
    }
  });
});

app.post('/stopStreamProcessor', (req, res) => {
  var params = {
    Name: req.body.stream_processor_name || 'mistreamprocessor'
  };
  rekognition.stopStreamProcessor(params, (err, data) => {
    if (!err) {
      res.json(data);
    } else {
      res.json(err);
    }

  });
});



app.listen(PORT, () => console.log(`Video Rekogniton Application Started on Port ${PORT}`));