var fs = require('fs'),
    fiveColorMap = require('five-color-map'),
    turf = require('turf');

var stateCodes = JSON.parse(fs.readFileSync('states.json', 'utf8'));

// load the congressional district data

var geojson = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

// use the five-color-map package to assign color numbers to each
// congressional district so that no two touching districts are
// assigned the same color number

var colored = fiveColorMap(geojson);

// add additional metadata to the GeoJSON for rendering later and
// compute bounding boxes for each congressional district and each
// state so that we know how to center and zoom maps

var labels = [],
    districtBboxes = {},
    stateBboxes = {};

colored.features.map(function(d) {
  // some states have district 'ZZ' which represents the area of
  // a state, usually over water, that is not included in any
  // congressional district --- skip these
  if (d.properties['CD114FP'] === 'ZZ')
    return;

  // Census TIGER files have INTPTLON/INTPTLAT which conveniently
  // provides a point where a label for the polygon can be placed.
  // Create a turf.point to hold information for rending labels.
  var pt = turf.point([parseFloat(d.properties['INTPTLON']), parseFloat(d.properties['INTPTLAT'])]);

  // get the district number
  var number = d.properties['CD114FP'] === '00' ? 'At Large' : d.properties['CD114FP'];

  // map the state FIPS code in the STATEFP attribute to the index of the state
  // in our states.json file
  var state;
  stateCodes.map(function(n,i) {
    if (parseInt(d.properties['STATEFP']) === parseInt(n['Code'])) state = i;
  });

  // add metadata to the label
  pt.properties = d.properties;
  pt.properties.title_short = stateCodes[state]['Abbr'] + ' ' + number;
  pt.properties.title_long = stateCodes[state]['State'] + ' ' + d.properties['NAMELSAD'];
  labels.push(pt);

  // collect bounding boxes for the districts
  var bounds = turf.extent(d);
  districtBboxes[stateCodes[state]['Abbr'] + number] = bounds;

  // and for the states
  if (stateBboxes[stateCodes[state]['Abbr']]) {
    stateBboxes[stateCodes[state]['Abbr']].features.push(turf.bboxPolygon(bounds));
  } else {
    stateBboxes[stateCodes[state]['Abbr']] = { type: 'FeatureCollection', features: [] };
    stateBboxes[stateCodes[state]['Abbr']].features.push(turf.bboxPolygon(bounds));
  }
});

// get the bounding boxes of all of the bounding boxes for each state
for (var s in stateBboxes) {
  stateBboxes[s] = turf.extent(stateBboxes[s]);
}

// write out data for the next steps

console.log('data ready');

fs.writeFileSync('./data/map.geojson', JSON.stringify(colored));
fs.writeFileSync('./data/map_labels.geojson', JSON.stringify(turf.featurecollection(labels)));

fs.writeFileSync('./example/states.js', 'var states = ' + JSON.stringify(stateCodes));

var bboxes = {};
for (var b in districtBboxes) { bboxes[b] = districtBboxes[b] };
for (var b in stateBboxes) { bboxes[b] = stateBboxes[b] };
fs.writeFileSync('./example/bboxes.js', 'var bboxes = ' + JSON.stringify(bboxes));
