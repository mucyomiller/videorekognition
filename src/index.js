// loads env vars
import path from 'path';
import fileUpload from 'express-fileupload';
import _ from 'lodash';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
const app = express();

//adds some middleware
app.use(fileUpload({
  limits: {
    fileSize: 50 * 1024 * 1024
  },
}));
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
export const kinesis = new AWS.Kinesis();


app.get('/', (req, res) => {
  res.send('index.html');
});
// IndexFaces End Points
app.post('/indexface', (req, res) => {
  const image = req.files.image;

  var params = {
    CollectionId: "persons_of_interests",
    DetectionAttributes: [],
    ExternalImageId: req.body.external_image_id,
    Image: {
      Bytes: image.data.buffer
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

// temporary retrieves results
app.post('/results', (req, res) => {
  var params = {
    ShardIterator: req.body.shard_iterator,
  };
  kinesis.getRecords(params, (err, data) => {
    if (!err) {
      let response = {};
      response.next_iterator = data.NextShardIterator;
      let arr = [];
      data.Records.forEach(Record => {
        const data = Buffer.from(Record.Data);
        if (typeof data !== "undefined") {
          const resObj = JSON.parse(data);
          resObj.FaceSearchResponse.forEach(response => {
            const _uniqData = _.uniqBy(response.MatchedFaces, (MatchedFace) => MatchedFace.Face.FaceId);
            arr.push(..._uniqData);
          });
        } else {
          console.log(`Waiting data ....`);
        }
      })
      response.data = _.uniqBy(arr, (e) => e.Face.ExternalImageId);
      res.status(200).json(response);
    } else {
      res.status(404).json({
        status: res.statusCode,
        data: err
      });
    }
  });
});

app.get('/describeStream', (req, res) => {
  var params = {
    StreamName: req.body.stream_name || 'midatastream'
  };
  kinesis.describeStream(params, (err, data) => {
    if (!err) {
      res.status(200).json(data);
    } else {
      res.status(404).json(err);
    }
  });
});
app.get('/getShardIterator', (req, res) => {
  var params = {
    ShardId: req.body.shard_id || 'shardId-000000000000',
    ShardIteratorType: "TRIM_HORIZON",
    StreamName: req.body.stream_name || 'midatastream'
  };
  kinesis.getShardIterator(params, (err, data) => {
    if (!err) {
      res.status(200).json(data);
    } else {
      res.status(404).json(err);
    }
  });
});

const searchByImage = (image) => {
  var params = {
    CollectionId: "persons_of_interests",
    Image: {
      Bytes: image.data.buffer
    }
  };
  rekognition.searchFacesByImage(params, (err, data) => {
    if (!err) {
      console.log(`SearchedFaceConfidence ${data.SearchedFaceConfidence}`);
      data.FaceMatches.forEach(face => {
        console.log(`We Founds => ${face.Face.FaceId} \n
        With Similarity of ${face.Similarity} \n
        He/She Is ${face.Face.ExternalImageId}
        `);
        console.log('let save it offline!');
        let uploadPath = __dirname + `/public/uploads/${face.Face.ExternalImageId}.${image.mimetype.split('/')[1]}`;
        image.mv(uploadPath, (err) => {
          if (!err) {
            console.log('saved file successfull');
          } else {
            console.log(err);
          }
        });
      });
    } else {
      console.log('Error =>' + err);
    }
  });
}
app.post('/searchFacesByImage', (req, res) => {
  if (!req.files) {
    return res.status(400).send('No files were uploaded. ');
  }
  const img = req.files.image;
  searchByImage(img);

});



app.listen(PORT, () => console.log(`Video Rekogniton Application Started on Port ${PORT}`));