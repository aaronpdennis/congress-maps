var fs = require('fs'),
    MapboxClient = require('mapbox'),
    AWS = require('aws-sdk');

var districtsFile = process.argv[2],
    labelsFile = process.argv[3],
    user = process.env.MAPBOX_USERNAME,
    accessToken = process.env.MAPBOX_WRITE_SCOPE_ACCESS_TOKEN;

var tileset_id = user + ".congress";
var tielset_name = "US_Congressional_Districts"

var client = new MapboxClient(accessToken);

// here's how to upload a file to Mapbox

function upload_tileset(file, id, name) {
  client.createUploadCredentials(function(err, credentials) {
    console.log('staging', file, '>', id, '...');

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
      if (err) throw err;

      // Create a Mapbox upload
      client.createUpload({
         tileset: id,
         url: credentials.url,
         name: name
      }, function(err, upload) {
        if (err) throw err;
        console.log(file, id, name, 'uploaded, check mapbox.com/studio for updates.');
      });

    });
  });
}

// do the upload

upload_tileset(labelsFile, tileset_id + '-labels', tielset_name + '_Labels')
upload_tileset(districtsFile, tileset_id, tielset_name)

