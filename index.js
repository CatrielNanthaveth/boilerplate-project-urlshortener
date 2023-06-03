require('dotenv').config({path: '.env'});
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dns = require('dns');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Database
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once("open", function() {
  console.log("we're connected!");
});

const urlSchema = new mongoose.Schema({
  id: Number,
  url: String
});

const urlModel = mongoose.model('url', urlSchema)

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// URL shorter
app.post("/api/shorturl", (req, res) => {
  let urlRegex = /https:\/\/www.|http:\/\/www./g;

  dns.lookup(req.body.url.replace(urlRegex, ''), (err, address, family) => {
    if(err) {
      res.json({ error: 'Invalid URL' })
    } else {
      urlModel
        .find().exec().then(data => {
          new urlModel({
            id: data.length,
            url: req.body.url
          }).save().then(() => {
            res.json({
              original_url: req.body.url,
              short_url: data.length
            });
          }).catch(err => {
            res.json(err);
          });
        });
    }
  });
});

app.get("/api/shorturl/:id", (req, res) => {
  console.log(req);

  if (!parseInt(req.params.id, 10)) {
    // The short URL identifier is not a number
    res.json({ "error": "Wrong format" });
    return;
  }

  try {
    urlModel.findOne({ "id": req.params.id }, (err, data) => {
      if (err) return;
      if (data){
        // redirect to the stored page
        res.redirect(data.url);
      } else {
        res.json({ "error": "No short URL found for the given input" });
      }
    });
  } catch (error) {
    return res.json({
      error: 'Invalid URL'
    });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
