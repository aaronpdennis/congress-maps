// Specify Mapbox default access token
var accessToken = 'pk.eyJ1IjoiZG1vcmlhcnR5IiwiYSI6ImNpejlid2Y1djAxNWsyeHFwNTVoM2ZibWEifQ.MlGaldJiUQ91EDGdjJxLsA';

// Specify uploaded Mapbox Studio style URL
var styleURL = 'mapbox://styles/dmoriarty/ciyyzloid003n2sq88m2ftdm3';
var mapId = 'dmoriarty.cd-114-2015'; // used by the click handler only

// HTML Element Queries. Also used for click events on the map
var exit = document.querySelector('.exit-select');
var eventList = document.querySelector('ul');
var selectionHeader = document.querySelector('.selected-container');
var nullMessageSelector = document.querySelector('.null-selection');

var readmeSelector;
var moretextSelector;
var districtCounter = 0

// - - - - - - - - - - - -
//
//  MENU CONTENT
//
// - - - - - - - - - - - -

// Welcome & Null messages for the sidebar.
var welcomeMessage = '<p>The Town Hall Project is an entirely volunteer-run, grassroots effort that empowers constituents across the country to have face-to-face conversations with their elected representatives.</p><p>Select a highlighted district to view when and where represenatives from that area are holding meetings.</p><img src="graphics/guide.gif" width="250px"></img><p>If you\'re aware of any events we\'ve missed, feel free to <a href="https://docs.google.com/spreadsheets/d/1yq1NT9DZ2z3B8ixhid894e77u9rN5XIgOwWtTW72IYA/htmlview?sle=true">contact us.</a>';

var nullMessage = '<p>No known upcoming events</p><p>Contact your representatives and ask for a meeting!</p><p>If you\'re aware of any events they\'ve missed, feel free to <a href="https://townhallproject.com/#submit">submit them.</a>';

// - - - - - - - - - - - -
//
//  GEOVIEWPORT VARIABLES
//
// - - - - - - - - - - - -

// Use GeoViewport and the window size to determine and appropriate center and zoom for the continental US
var continentalView = function(w,h) { return geoViewport.viewport([-128.8, 23.6, -65.4, 50.2], [w, h]); }
var continental = continentalView(window.innerWidth/2, window.innerHeight/2);

// - - - - - - - - - - - -
//
//  MENU COMPONENTS
//
// - - - - - - - - - - - -

// Exit interaction for the 'x' so users can return to the initial about message
exit.addEventListener('click', clearSidemenu);

// Create an object to list all the possible districts for a given state or territory
var stateList = states.map(function(d) { return { name: d.Name, abbr: d.USPS }; });
var possibleDistricts = {};
stateList.map(function(d) { possibleDistricts[d.abbr] = [] });

// For each state, add the numbers of its districts
for (d in bboxes) {
  possibleDistricts[d.slice(0,2)].push(d.slice(2,d.length));
}

// Sort in ascending order each state's list of districts
for (d in possibleDistricts) {
  possibleDistricts[d].sort(function(a,b) {
    if (b === "") { return 1 } else { return parseInt(a) - parseInt(b); }
  });
  // For states with only one district, make the list of districts only contain an at-large choice
  if (possibleDistricts[d].length === 2) possibleDistricts[d] = ['00'];
}

// Add an option to the interactive State menu for each state
stateList.map(function(d) {
  $('#state')
    .append($("<option></option>")
      .attr('value', d.abbr).text(d.name));
})

// Create an event listener that responds to the selection of a state from the menu
$('#state').change(function() {
  if (this.value === '') { window.location.hash = '#' }
  else {
    var hash = window.location.hash;
    var newHash = 'state=' + this.value;
    window.location.hash = newHash;
  }
});

// Create an event listener that responds to the selection of a district from the menu
$('#district').change(function() {
  var hash = window.location.hash;
  var currentDistrictIndex = hash.indexOf('&district=');
  var newHash = currentDistrictIndex >= 0 ?
    hash.slice(0,currentDistrictIndex) + '&district=' + this.value :
    hash + '&district=' + this.value ;
  window.location.hash = newHash;
});

var townhallproject = {};
var states = {};
var contacts = {};

// - - - - - - - - - - - -
//
//  INTERACTIVE MAP
//
// - - - - - - - - - - - -

// Checks for support of Mapbox GL. Works with most modern browsers.
if (mapboxgl.supported({ failIfMajorPerformanceCaveat: true })) {

  // Initialize the map
  mapboxgl.accessToken = accessToken;
  var map = new mapboxgl.Map({
      container: 'map',
      style: styleURL,
      center: continental.center,
      zoom: continental.zoom,
      minZoom: 2.5
  });

  // Once map is fully loaded...
  map.on('load', function() {
    // Retrieve the JSON styling object for the map
    var baseStyle = map.getStyle()

    // Add zoom controls to the map
    map.addControl(new mapboxgl.NavigationControl());

    // Disable rotate
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    // Add zoom out to national view button
    document.querySelector('.mapboxgl-ctrl-compass').remove()

    var iDiv = '<button class="mapboxgl-ctrl-icon mapboxgl-ctrl-usa"><img src="./graphics/usa.svg"></img></button>'

    var uDiv = document.createElement('button');
    uDiv.className = 'mapboxgl-ctrl-icon mapboxgl-ctrl-usa';
    uDiv.innerHTML = '<span class="usa-icon"></span>';
    uDiv.addEventListener('click', function(){
      clearSidemenu();
      window.location.hash = '#'
      map.flyTo(continentalView(window.innerWidth/2, window.innerHeight/2));
    });
    document.querySelector('.mapboxgl-ctrl-group').appendChild(uDiv);

    $.getJSON( "../states.json", function( data ) {
      states = data;
    });

    $.getJSON( "../data/contacts.json", function( data ) {
      contacts = data;
    });

    // load townhallproject.json
    $.getJSON( "../data/townhallproject.json", function( data ) {

      filterFromData(data)
      townhallproject = data;

      return;

      $('#state').empty();
      selectableStates = []

      for (var i = data.length - 1; i >= 0; i--) {
        var fullName = data[i]['Home CState']
        var thisAbbr = data[i].State
        selectableStates.indexOf(fullName) === -1 ? selectableStates.push(fullName) : '';
      }

      selectableStates.unshift('United States')

      for (var i = selectableStates.length - 1; i >= 0; i--) {
        if (selectableStates[i] === 'United States') {
          $('#state')
            .prepend($("<option>United States</option>")
            .attr('value', '')
          )
        } else {
          states.map(function(n,j) {
            if (n['Name'] === selectableStates[i]) {
              $('#state')
                .append($("<option></option>")
                .attr('value', n['USPS']).text(selectableStates[i]))
            }
          });
        }
      }
    });

    function filterFromData(data) {
      // Set up filter for which districts actually have meetings
      var filterInitial = ['any']
      var districtNum = ''
      var stateNum = ''
      var filterGeoID = ''

      // For each event...
      for (var i = data.length - 1; i >= 0; i--) {
        sAbbr = data[i]['Home CState']

        // Map state abbreviations to the FIPS code
        states.map(function(n,i) {
          if (sAbbr == n['Name']) {
            stateNum = n['FIPS']
          }
        });

        if (stateNum < 10) {
          stateNum = '0' + stateNum
        }

        // Uncomment below to get individual district data
        // if (stateNum === '04') {
        //   console.log(data[i])
        //   if (data[i].District === 'AZ-04') {
        //     console.log(data[i])
        //   }
        // }

        // Start by checking if it's a Senator or District
        if (data[i].District === 'Senate') {

          filterInitial.push(['==', 'STATEFP', stateNum.toString()])

        // Now look for district congressmen meeting
        } else {
          districtNum = data[i].District.substring(3)

          // Add 0 to the start so it matches the GEOID
          if (districtNum.length === 1) {
            districtNum = '0' + districtNum
          }

          filterGeoID = stateNum + districtNum
          filterInitial.push(['==', 'GEOID', filterGeoID])
        }
      }
      // Add those filters
      map.setFilter('district_fill', filterInitial);
      map.setFilter('district_glow', filterInitial);
    }

    // Given a state postal abbreviation and a US Census district number, focus the map on that area
    function focusMap(stateAbbr, districtCode) {
      //** INTERACTIVE MENU
      // Set the interactive menu to focus on the state and district code, if provided
      $('#state').val(stateAbbr);
      // $('#district').empty();
      // possibleDistricts[stateAbbr].map(function(d) {
      //   $('#district')
      //     .append($("<option></option>")
      //       .attr('value', d).text(d));
      // });
      // if (districtCode) $('#district').val('districtCode');

      // - - - - - - - - - - - -
      //
      //  FILTERS FOR DISTRICTS
      //
      // - - - - - - - - - - - -

      // Determine current window height and width and whether the bbox should focus on a single district
      var height = window.innerHeight,
          width = window.innerWidth,
          districtAbbr = districtCode ? districtCode : '';

      // Determine the best center and zoom level for the new map focus and then go there
      var view = geoViewport.viewport(bboxes[stateAbbr + districtAbbr], [width/2, height/2]);
      clearSidemenu();
      map.flyTo(view);
    }

    // Check the URL hash to determine how the map should be focused
    function checkHash() {
      // If a URL hash is found...
      if(window.location.hash) {

        // Grab the URL hash
        var hash = window.location.hash;

        // Split up the hash string into its components
        var hashData = hash.substring(1).split('&').map(function(d) { return d.split('=') });

        // Determine state or district based on the hash data
        var state, district;
        hashData.map(function(d) {
          if (d[0] === 'state') state = d[1];
          if (d[0] === 'district') district = d[1];
        })

        // If a state or state and district were found in the URL hash, focus the map to this location
        if (state || (state && district)) focusMap(state, district);

      } else {
        // If there is no URL hash...
        // And if its not the first time the page is loading...
        if (!initial) {

          // Reset the map style to its original style object and jump back to the continental view
          map.flyTo(continentalView(window.innerWidth/2, window.innerHeight/2));

          //** INTERACTIVE MENU
          // Empty the list of districts because no state is selected
          // $('#district').empty();
        }
      }
    }

    // When the URL hash changes, call the checkHash function
    window.onhashchange = checkHash;

    // Record that it initial page load and the hash still needs to be checked
    var initial = true;
    checkHash();

    // Record that it is no longer the initial page load
    initial = false;

    // A click handler that shows what was under the cursor where

    // - - - - - - - - - - - -
    //
    //  FEATURE INTERACTION
    //
    // - - - - - - - - - - - -
    map.on("click", function(e) {
      var district = null;
      clearSidemenu()

      if (1) {
        // The map control provides a client-side-only way to determine what
        // is under the cursor. We restrict the query to only the layers that
        // provide congressional district polygons. Note that this only scans
        // features that are currently shown on the map. So if you've filtered
        // the districts so only a state or a single district is showing, this
        // will restrict the query to those districts.
        var features = map.queryRenderedFeatures(
          e.point,
          {
            layers: ["district_interactive"]
          });
        if (features.length > 0)
          // The feature properties come from the original GeoJSON uploaded to Mapbox.
          district = features[0];

      } else {
        // Use the Mapbox tilequery API instead.
        //
        // This is an example of how you would use the API in a server-side
        // environment where you don't have the map control, or as a part
        // of geocoding where you have lat/lng coordinates.
        //
        // Note that, from the Mapbox API docs:
        // "Use of this endpoint is rate limited to 600 requests per minute."
        $.ajax({
          url: 'https://api.mapbox.com/v4/' + mapId + '/tilequery/' + e.lngLat.lng + ',' + e.lngLat.lat + '.json?radius=0&access_token=' + accessToken,
          method: 'GET',
          success: function(resp) {
            if (resp.type == "FeatureCollection" && resp.features.length > 0)
              // resp is always a FeatureCollection, just sanity checking, but it might
              // be empty. If it's not empty, it will contain a single Feature
              // (whose geometry is a Polygon) represending the boundaries of a
              // congressional district. Its properties come from the original
              // GeoJSON uploaded to Mapbox.
              district = resp.features[0];
          }
        });
      }

      // Check for visibility of the 'selected' view
      var visibility = map.getLayoutProperty('selected-fill', 'visibility');

      if (district) {
        // If there are no selections, turn dem layers on
        if (visibility === 'none') {
          map.setLayoutProperty('selected-fill', 'visibility', 'visible');
          map.setLayoutProperty('selected-border', 'visibility', 'visible');
        }

        // Filter for which district has been selected
        var filter = ['all', ['==', 'state', district.properties.state], ['==', 'CD114FP', district.properties.CD114FP]];

        // Set that layer filter to the selected
        map.setFilter('selected-fill', filter);
        map.setFilter('selected-border', filter);
      } else {
        // If there are no selections, turn dem layers off
        if (visibility === 'visible') {
          map.setLayoutProperty('selected-fill', 'visibility', 'none');
          map.setLayoutProperty('selected-border', 'visibility', 'none');
        }
      }

      // Ok now we have the district either from the client-side query or the
      // API.
      if (district) {
        // district.state now holds the two-letter USPS state abbreviation,
        // and district.number now holds a zero-padded two-digit district
        // number (00 for at-large districts). title_long and title_short
        // have strings useful for display (e.g. "VA 8" and "Virginia’s 8th
        // Congressional District", respectively).

        var state_name;
        states.map(function(n,i) {
          if (district.properties.state == n['USPS']) {
            state_name = n['Name'];
          }
        });

        //find the events and add to the metadata
        var meeting_type;
        var date;
        var time;
        var location;
        var address;
        var notes;
        var member;
        var district;
        var state;
        var filterDis;
        var fillerDis
        var msg = "";
        townhallproject.map(function(n,i) {

          if(district.properties.number.charAt(0) === '0') {
            fillerDis = district.properties.number.charAt(1)
          }

          if (((district.properties.state + '-' + district.properties.number) == n['District']) || (district.properties.state + '-' + fillerDis) == n['District'] || (state_name == n['Home CState'] && n['District'] == 'Senate')) {

            member = n['Member'];
            d = n['District'];
            // if (d = 'Senate') {
            //   d = 'Senator'
            // }
            meeting_type = n['Meeting Type'];
            date = n['Date'].replace('2017', '');
            time = n['Time'];
            location = n['Location'];
            address = (n['Street Address'] ? n['Street Address'] + ", " : '') + (n['City'] ? n['City'] + ", " : '') + (n['State'] ? n['State'] : '') + (n['State'] && n['Zip'] ? ', ' : ' ') + (n['Zip'] ? n['Zip'] : '');
            notes = n['Notes'];
            state = n['State'];
            districtNum = n['District'];

            // Check Note for an HTML link and add those anchor tags if so.
            var regex = /(http(s?))\:\/\/.+/gi

            if (regex.test(notes)) {
              var regex2 = /(http(s?))\:\/\/.+/gi
              var itsalink = regex2.exec(notes)
              if(itsalink) {
                var notes = notes.replace(/(http(s?))\:\/\/.+/gi, '<a target="_blank" href="') + itsalink[0] + '">Event Link</a>'
              }
            }

            // Shorten Note text, hide behind a 'read more' option
            // if (notes.length > 64) {
            //   noteFirst = notes.substring(0, 64)
            //   noteSecond = notes.substring(64)

            //   districtCounter++

            //   notes = '<span class="event-notes__first"></span>' + noteFirst + '<span class="event-notes__elp event-notes__elp' + districtCounter + '">...</span><a class="event-readmore event-readmore__' + districtCounter + '">read more</a><span class="event-notes__second event-notes__second'+ districtCounter + ' hidden">' + noteSecond + '</span>'
            // }

            msg = msg + '<li class="event"><div class="event-date">' + date + ' ' + time + '</div><div class="event-person">' + member + ', '  + d +'</div><div class="event-type">' + (meeting_type ? '<dt>format </dt><dd>' + meeting_type + '</dd>' : '') + '</div><div class="event-location"><dt>location</dt><dd><p>' + location + '</p><p>' + address + '</p></dd></div>' + (notes ? '<div class="event-notes"><dt>Details</dt><dd>' + notes + '</dd>' : '') + '</div></li>';
          }
        });

        var reps = '';
        contacts.map(function(n,i) {
          if(district.properties.number.charAt(0) === '0') {
            fillerDis = district.properties.number.charAt(1)
          }

          if (
            ((district.properties.state + '-' + district.properties.number) == (n['state'] + '-' + n['district']))
            || ((district.properties.state + '-' + fillerDis) == (n['state'] + '-' + n['district']))
            || (district.properties.state == n['state'] && n['district'] == 'Senate')) {

            reps = reps + '<p class="reps-name">' + (n['district'] == 'Senate' ? 'Senator ' : 'Representative ') + n['name'] + ' ' + '</p><p class="reps-number"><img class="reps-image" src="graphics/phone.svg" />' + n['phone'] + '</p>';
          }
        });

        var msg;

        //
        // Return null message if there's no meetings for that area
        //

        var nullMessage = '<p>No known upcoming events</p><p>Contact your representatives and ask for a meeting!</p></p>' + reps + '</p><p>If you\'re aware of any events they\'ve missed, feel free to <a href="https://townhallproject.com/#submit">submit them.</a>';

        if (msg == "") {
          msg = nullMessage;
          nullMessageSelector.className = 'null-selection'
          nullMessageSelector.innerHTML = nullMessage
        } else {
          msg = msg + '<li class="event"><p>Contact your representatives and ask for a meeting!</p><p>' + reps + '</li>'
          nullMessageSelector.className = 'null-selection hidden'
        }

        //
        // Clear current contents
        //
        eventList.innerHTML = "";
        exit.className = 'exit-select'

        // - - - - - - - - - - - -
        //
        //  UPDATE MENU CONTENT
        //
        // - - - - - - - - - - - -

        if (state_name) {
          selectionHeader.className = 'selected-container'
          selectionHeader.innerHTML = state_name + '-' + district.properties.number; //state_name + (districtNum !== 'Senate' ? ', district ' + districtNum : '') + reps;
        } else {
          selectionHeader.className = 'selected-container hidden'
          selectionHeader.innerHTML = "";
        }
        // and finally add in the event contents

        eventList.innerHTML = msg;

        // reset the ticker for district #
        districtCounter = 0

        //
        // Old popup code
        //

        // var popup = new mapboxgl.Popup({ offset: [0, -15] })
        //  .setLngLat(e.lngLat)
        //  .setHTML(msg)
        //  .addTo(map);
        // alert("That's " + district.state + "-" + district.number + ", i.e." + district.title_long + ".");

      } else {
        // alert("You clicked on a location that is not within a U.S. congressional district.")
      }
    })

  });

} else {

  // If Mapbox GL is not supported
  // Log this information to the console (perhaps an alert that the website is not fully featured would be better?)
  console.log('Mapbox GL not supported');

  // Initialize the map
  L.mapbox.accessToken = accessToken;
  var map = L.mapbox.map('map');
  L.mapbox.styleLayer(styleURL).addTo(map);

  // Redefine the focusMap function from above
  function focusMap(stateAbbr, districtCode) {
    var height = window.innerHeight,
        width = window.innerWidth,
        districtAbbr = districtCode ? districtCode : '';

    var view = geoViewport.viewport(bboxes[stateAbbr + districtAbbr], [width/2, height/2]);
    map.setView([view.center[1], view.center[0]], view.zoom + 1);

  }

  // Redefine the checkHash function from above
  function checkHash() {
    if(window.location.hash) {
      var hash = window.location.hash;
      var hashData = hash.substring(1).split('&').map(function(d) { return d.split('=') });

      var state, district;
      hashData.map(function(d) {
        if (d[0] === 'state') state = d[1];
        if (d[0] === 'district') district = d[1];
      })

      if (state || (state && district)) focusMap(state, district);
    }
  }

  // Create an event listener for changes in the URL hash
  window.onhashchange = checkHash;
  checkHash();
}

function clearSidemenu() {
  // Rest event list
  eventList.innerHTML = "";

  // Replace sidebar content
  nullMessageSelector.innerHTML = welcomeMessage;
  nullMessageSelector.className = 'null-selection'

  // Hide header
  selectionHeader.className = 'selected-container hidden';
  selectionHeader.innerHTML = "";

  // Hide Exit Handle
  exit.className = 'exit-select hidden';

  // Reset Map Selections
  map.setLayoutProperty('selected-fill', 'visibility', 'none');
  map.setLayoutProperty('selected-border', 'visibility', 'none');

}
