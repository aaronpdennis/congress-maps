var fs = require('fs'),
    fiveColorMap = require('five-color-map'),
    turf = require('turf');

// $ mkdir data
// $ wget -P data ftp://ftp2.census.gov/geo/tiger/TIGER2015/CD/tl_2015_us_cd114.zip
// $ unzip data/tl_2015_us_cd114.zip
// $ ogr2ogr -f GeoJSON -t_srs crs:84 data/map_data.geojson data/tl_2015_us_cd114.shp
// $ node process.js data/map_data.geojson
// $ tippecanoe -o data/congress12.mbtiles -f -z 12 -Z 0 -pS -pp -l districts -n "US Congressional Districts" data/map.geojson
// $ node upload.js data/congress.mbtiles MAPBOX_USERNAME MAPBOX_ACESS_TOKEN
// $ sed -i -- 's/pk.eyJ1IjoiYWFyb25kZW5uaXMiLCJhIjoiem5LLURoYyJ9.T3tswGTI5ve8_wE-a02cMw/<your Mapbox default access token>/g' website/index.html

var file = process.argv[2],
    accessToken = process.argv[3];

var stateCodes = JSON.parse(fs.readFileSync('states.json', 'utf8'));

var geojson = JSON.parse(fs.readFileSync(file, 'utf8'));

var colored = fiveColorMap(geojson);

var labels = [],
    districtBboxes = {},
    stateBboxes = {};

colored.features.map(function(d) {

  var pt = turf.point([parseFloat(d.properties['INTPTLON']), parseFloat(d.properties['INTPTLAT'])]);

  var number = d.properties['CD114FP'] === '00' ? 'AT LARGE' : d.properties['CD114FP'];

  var state;
  stateCodes.map(function(n,i) {
    if (parseInt(d.properties['STATEFP']) === parseInt(n['Code'])) state = i;
  });

  pt.properties = d.properties;

  pt.properties.title_short = stateCodes[state]['Abbr'] + ' ' + number;
  pt.properties.title_long = stateCodes[state]['State'] + ' ' + d.properties['NAMELSAD'];

  if (number !== 'ZZ') {

    labels.push(pt);

    var bounds = turf.extent(d);
    districtBboxes[stateCodes[state]['Abbr'] + number] = bounds;

    if (stateBboxes[stateCodes[state]['Abbr']]) {
      stateBboxes[stateCodes[state]['Abbr']].features.push(turf.bboxPolygon(bounds));
    } else {
      stateBboxes[stateCodes[state]['Abbr']] = { type: 'FeatureCollection', features: [] };
      stateBboxes[stateCodes[state]['Abbr']].features.push(turf.bboxPolygon(bounds));
    }

  }
});

for (var s in stateBboxes) {
  stateBboxes[s] = turf.extent(stateBboxes[s]);
}

var data = turf.featurecollection(colored.features.concat(labels));

console.log('data ready');

fs.writeFileSync('./data/map.geojson', JSON.stringify(data));

fs.writeFileSync('./website/states.js', 'var states = ' + JSON.stringify(stateCodes));

var bboxes = {};
for (var b in districtBboxes) { bboxes[b] = districtBboxes[b] };
for (var b in stateBboxes) { bboxes[b] = stateBboxes[b] };

fs.writeFileSync('./website/bboxes.js', 'var bboxes = ' + JSON.stringify(bboxes));
