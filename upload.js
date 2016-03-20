var fs = require('fs'),
    MapboxClient = require('mapbox'),
    AWS = require('aws-sdk');

var data = JSON.parse(fs.readFileSync('./map.geojson', 'utf8'));

var file = process.argv[2],
    user = process.argv[3],
    accessToken = process.argv[4];

var client = new MapboxClient(accessToken);

client.createUploadCredentials(function(err, credentials) {
  console.log('staging...');
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
    Body: fs.createReadStream(file)
  }, function(err, resp) {
    console.log(resp);

    client.createUpload({
       tileset: ["aarondennis", 'congress'].join('.'),
       url: credentials.url,
       name: 'US Congressional Districts'
    }, function(err, upload) {
      console.log(upload);

      console.log('check mapbox.com/studio for updates.');

    });

  });
});
