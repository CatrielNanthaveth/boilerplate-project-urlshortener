require('dotenv').config({ path: '.env' });
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
db.once("open", function () {
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

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

// URL shorter
app.post("/api/shorturl", (req, res) => {
  let url = req.body.url;

  // Search for '://', store protocol and hostname+path
  const protocolRegExp = /^https?:\/\/(.*)/i;

  // Search for patterns like xxxx.xxxx.xxxx etc.
  const hostnameRegExp = /^([a-z0-9\-_]+\.)+[a-z0-9\-_]+/i;

  // "www.example.com/test/" and "www.example.com/test" are the same URL
  if (url.match(/\/$/i))
    url = url.slice(0, -1);

  const protocolMatch = url.match(protocolRegExp);
  if (!protocolMatch) {
    return res.json({ "error": "Invalid URL" });
  }

  // Remove the protocol temporarily  for DNS lookup
  const hostAndQuery = protocolMatch[1];

  // Here we have a URL w/out protocol
  // DNS lookup: validate hostname
  const hostnameMatch = hostAndQuery.match(hostnameRegExp);
  if (hostnameMatch) {
    // the URL has a valid www.whaterver.com[/something-optional] format
    dns.lookup(hostnameMatch[0], (err) => {
      if (err) {
        // no DNS match, invalid Hostname, the URL won't be stored
        res.json({ "error": "Invalid Hostname" });
      } else {
        // URL is OK, check if it's already stored
        urlModel
          .find().exec().then(data => {
            new urlModel({
              id: data.length + 1,
              url: req.body.url
            }).save().then(() => {
              res.json({
                original_url: req.body.url,
                short_url: data.length + 1
              });
            }).catch(err => {
              res.json(err);
            });
          });
      }
    });
  } else {
    // the URL has not a www.whatever.com format
    res.json({ "error": "Invalid URL" });
  };
});


app.get("/api/shorturl/:id", (req, res) => {

  if (!parseInt(req.params.id, 10)) {
    // The short URL identifier is not a number
    res.json({ "error": "Wrong format" });
    return;
  }

  try {
    urlModel.findOne({ "id": req.params.id }, (err, data) => {
      if (err) {
        console.log(err);
      }
      if (data) {
        // redirect to the stored page
        res.redirect(data.url);
      } else {
        res.json({ "error": "No short URL found for the given input" });
      }
    });
  } catch (error) {
    console.log(error);
    return res.json({
      error: 'Invalid URL'
    });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
