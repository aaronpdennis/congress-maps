# Mapping US Congressional Districts

Follow the steps below to create a web map of United States congressional districts from Census Bureau data using Mapbox. You can also use this to create a lat/lng-to-congressional district API.

You will need an account on Mapbox.com. Then follow the commands below from the Mac OS X or Ubuntu terminal.

Why use [Tippecanoe](https://github.com/mapbox/tippecanoe)? Using Tippecanoe provides more control over how the geometries are tiled into a map. For comparison, using the Mapbox Studio default upload will not show a zoomed-out full country view of the data because the boundaries are so detailed; the default upload thinks you are only interested in looking closer at the data. Tippecanoe stops  oversimplification of the geometry and also specifies a min/max zoom level.

#### Dependencies:

On OS X, install required dependencies with Homebrew:

```
brew install tippecanoe gdal node
```

On Ubuntu, you'll need node:

```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash
nvm install 5.0
```

and gdal and Tippecanoe, which must be built from sources:

```
sudo apt-get install gdal-bin libprotobuf-dev protobuf-compiler libsqlite3-dev
git clone https://github.com/mapbox/tippecanoe
cd tippecanoe
make
make install
```

#### Setup:

Download this repository and then use `npm` to install a few more dependencies:

```
git clone https://github.com/aaronpdennis/congress-maps.git
cd congress-maps
npm install
```

#### Creating the map:

To complete these steps, run the commands below. Set `MAPBOX_USERNAME` to your Mapbox username, `MAPBOX_DEFAULT_ACCESS_TOKEN` to your Mapbox default access token, and `MAPBOX_WRITE_SCOPE_ACCESS_TOKEN` to a `uploads:write` scope access token from your [Mapbox account](https://www.mapbox.com/studio/account/tokens).

```
# setup Mapbox account name and access tokens
export MAPBOX_USERNAME=<your mapbox username>
export MAPBOX_DEFAULT_ACCESS_TOKEN=<your mapbox default access token>
export MAPBOX_WRITE_SCOPE_ACCESS_TOKEN=<your mapbox write scope access token>

# create directory to store data
mkdir data

# download Census boundaries data, unzip the data, and convert it to GeoJSON
wget -P data ftp://ftp2.census.gov/geo/tiger/TIGER2017/CD/tl_2017_us_cd115.zip
unzip data/tl_2017_us_cd115.zip -d ./data/
ogr2ogr -f GeoJSON -t_srs crs:84 data/congressional_districts.geojson data/tl_2017_us_cd115.shp

# run processing on data
node process.js data/congressional_districts.geojson

# create Mapbox vector tiles from data
tippecanoe -o data/cd-115-2017.mbtiles -f -z 12 -Z 0 -B 0 -pS -pp -l districts -n "US Congressional Districts" data/map.geojson

# upload map data to Mapbox.com
node upload.js data/cd-115-2017.mbtiles

# modify mapbox-style-template.json to use your Mapbox account and save as data/mapbox-style.json
sed s/'USER'/"$MAPBOX_USERNAME"/g mapbox-style-template.json > data/mapbox-style.json
```

Next, go to [mapbox.com/studio/styles](https://www.mapbox.com/styles), then drag-and-drop the `data/mapbox-style.json` file onto the screen. This should upload the map style to Mapbox.

Check out [mapbox.com/studio](https://www.mapbox.com/studio) to see updates on data processing. Once Mapbox is finished processing your upload, you can try it out.

#### Usage:

Use the files in the `example` directory as the basis for making a web map with functionality to focus on specific states or districts. To use this example web map, you'll need to change out my map style and default access token for your own. In the `index.html` file, replace my Mapbox default access token on line 75 and my map style URL on line 79 with your own.

After following the steps above, `index.html` will be a full page web map of U.S. Congressional districts. Host this file and the two supporting scripts (`states.js`, `bboxes.js`) on your website. If you don't want the interactive menu on your map, search through `index.html` and remove all sections of code that immediately follow the `INTERACTIVE MENU` line comment labels.

With this web map, you can show specific congressional districts using the URL hash. Set the location hash to `state={state abbreviation}` to show a specific state and add `&district={district number}` to specify a district within the state. The hash expects US Census two letter state abbreviations and district number conventions. At Large districts are numbered `00` and all other districts are two character numbers: `district=01`, `district=02`, ..., `district=15`, etc.

See the click handler for an example of how to use the Mapbox API to get the congressional district at a particular lat/lng coordinate.

#### Examples:

To show districts in the state of Virginia: http://aaronpdennis.github.io/congress-maps/example/#state=VA

To show the 5th district of California: http://aaronpdennis.github.io/congress-maps/example/#state=CA&district=05
