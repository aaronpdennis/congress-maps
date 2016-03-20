var fs = require('fs'),
    MapboxClient = require('mapbox'),
    AWS = require('aws-sdk');

var districtsFile = process.argv[2],
    labelsFile = process.argv[3],
    styleFile = process.argv[4],
    user = process.argv[5],
    accessToken = process.argv[6];

var client = new MapboxClient(accessToken);

// Upload district boundaries data to Mapbox.com
client.createUploadCredentials(function(err, credentials) {
  console.log('staging districts...');

  // Use aws-sdk to stage the file on Amazon S3
  var s3 = new AWS.S3({
       accessKeyId: credentials.accessKeyId,
       secretAccessKey: credentials.secretAccessKey,
       sessionToken: credentials.sessionToken,
       region: 'us-east-1'
  });
  s3.putObject({
    Bucket: credentials.bucket,
    Key: credentials.key,
    Body: fs.createReadStream(districtsFile)
  }, function(err, resp) {
    if (err) throw err;

    // Create a Mapbox upload
    client.createUpload({
       tileset: [user, 'congress'].join('.'),
       url: credentials.url,
       name: 'US_Congressional_Districts'
    }, function(err, upload) {
      if (err) throw err;
      console.log('districts uploaded, check mapbox.com/studio for updates.');
    });

  });
});

// Upload district labels data to Mapbox.com
client.createUploadCredentials(function(err, credentials) {
  console.log('staging district labels...');

  // Use aws-sdk to stage the file on Amazon S3
  var s3 = new AWS.S3({
       accessKeyId: credentials.accessKeyId,
       secretAccessKey: credentials.secretAccessKey,
       sessionToken: credentials.sessionToken,
       region: 'us-east-1'
  });
  s3.putObject({
    Bucket: credentials.bucket,
    Key: credentials.key,
    Body: fs.createReadStream(labelsFile)
  }, function(err, resp) {
    if (err) throw err;

    // Create a Mapbox upload
    client.createUpload({
       tileset: [user, 'congress-labels'].join('.'),
       url: credentials.url,
       name: 'US_Congressional_Districts_Labels'
    }, function(err, upload) {
      if (err) throw err;
      console.log('labels uploaded, check mapbox.com/studio for updates.');
    });

  });
});
