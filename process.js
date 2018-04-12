var fs = require('fs'),
    fiveColorMap = require('five-color-map'),
    turf = require('turf');

var stateCodes = JSON.parse(fs.readFileSync('states.json', 'utf8'));

// load the congressional district data

var geojson = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

// some states have district 'ZZ' which represents the area of
// a state, usually over water, that is not included in any
// congressional district --- filter these out

var filtered = geojson.features.filter(function(d) {
  return d.properties['CD115FP'] !== 'ZZ' ? true : false;
});
var districts = { 'type': 'FeatureCollection', 'features': filtered };

// use the five-color-map package to assign color numbers to each
// congressional district so that no two touching districts are
// assigned the same color number

var colored = fiveColorMap(districts);

// turns 1 into '1st', etc.
function ordinal(number) {
  var suffixes = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'];
  if (((number % 100) == 11) || ((number % 100) == 12) || ((number % 100) == 13))
    return number + suffixes[0];
  return number + suffixes[number % 10];
}

// add additional metadata to the GeoJSON for rendering later and
// compute bounding boxes for each congressional district and each
// state so that we know how to center and zoom maps

var districtBboxes = {},
    stateBboxes = {};

// empty FeatureCollection to contain final map data
var mapData = { 'type': 'FeatureCollection', 'features': [] }

colored.features.map(function(d) {

  // Census TIGER files have INTPTLON/INTPTLAT which conveniently
  // provides a point where a label for the polygon can be placed.
  // Create a turf.point to hold information for rending labels.
  var pt = turf.point([parseFloat(d.properties['INTPTLON']), parseFloat(d.properties['INTPTLAT'])]);

  // Get the district number in two-digit form ("00" (for at-large
  // districts), "01", "02", ...). The Census data's CD115FP field
  // holds it in this format. Except for the island territories
  // which have "98", but are just at-large and should be "00".
  var number = d.properties['CD115FP'];
  if (number == "98")
    number = "00";

  // map the state FIPS code in the STATEFP attribute to the USPS
  // state abbreviation and the state's name
  var state;
  var state_name;
  stateCodes.map(function(n,i) {
    if (parseInt(d.properties['STATEFP']) === parseInt(n['FIPS'])) {
      state = n['USPS'];
      state_name = n['Name'];
    }
  });

  // add the district number and USPS state code to the metadata
  d.properties.number = number;
  d.properties.state = state;

  // add metadata to the label
  pt.properties = JSON.parse(JSON.stringify(d.properties)); // copy hack to avoid mutability issues
  pt.properties.title_short = state + ' ' + (number == "00" ? "At Large" : parseInt(number));
  pt.properties.title_long = state_name + '’s ' + (number == "00" ? "At Large" : ordinal(parseInt(number))) + ' Congressional District';

  // add a type property to distinguish between labels and boundaries
  pt.properties.group = 'label';
  d.properties.group = 'boundary';

  // add both the label point and congressional district to the mapData feature collection
  mapData.features.push(pt);
  mapData.features.push(d);

  // collect bounding boxes for the districts
  var bounds = turf.extent(d);
  districtBboxes[state + number] = bounds;

  // and for the states
  if (stateBboxes[state]) {
    stateBboxes[state].features.push(turf.bboxPolygon(bounds));
  } else {
    stateBboxes[state] = { type: 'FeatureCollection', features: [] };
    stateBboxes[state].features.push(turf.bboxPolygon(bounds));
  }
});

// get the bounding boxes of all of the bounding boxes for each state
for (var s in stateBboxes) {
  stateBboxes[s] = turf.extent(stateBboxes[s]);
}

// write out data for the next steps
console.log('writing data...');

fs.writeFileSync('./data/map.geojson', JSON.stringify(mapData));

fs.writeFileSync('./example/states.js', 'var states = ' + JSON.stringify(stateCodes, null, 2));

var bboxes = {};
for (var b in districtBboxes) { bboxes[b] = districtBboxes[b] };
for (var b in stateBboxes) { bboxes[b] = stateBboxes[b] };
fs.writeFileSync('./example/bboxes.js', 'var bboxes = ' + JSON.stringify(bboxes, null, 2));

console.log('finished processing, ready for tiling');
