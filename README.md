# Mapping US Congressional Districts

Follow the steps below to create a web map of United States congressional districts from Census Bureau data.

First, you'll need to setup an account on Mapbox.com. Then, run the following commands from the Mac OS X Terminal command line:

#### Dependencies:

Install required dependencies with Homebrew:

```
brew install tippecanoe gdal node
```

#### Setup:

Download this repository and then use `npm` to install a few more dependencies:

```
git clone https://github.com/aaronpdennis/congress-maps.git
cd congress-maps
npm install
```

Next steps: 

1. make a directory to store the data files we'll be creating
2. use `wget` to download district boundaries from the US Census
3. `unzip` that file
4. convert the districts shapefile to GeoJSON
5. process the districts GeoJSON data with a `node` script
6. use tippecanoe to create a vector `mbtiles` file
7. upload our data to Mapbox

To execute these steps, run the commands below. Replace `MAPBOX_USERNAME` with your Mapbox username and replace `MAPBOX_ACESS_TOKEN` with a `scope:write` access token from your Mapbox account.

```
# setup Mapbox account name and access tokens
export MAPBOX_USERNAME=<your mapbox username>
export MAPBOX_DEFAULT_ACCESS_TOKEN=<your mapbox default access token>
export MAPBOX_WRITE_SCOPE_ACCESS_TOKEN=<your mapbox write scope access token>

# create director to store data
mkdir data

# dowload census boundaries data, unzip the data, and convert it to GeoJSON
wget -P data ftp://ftp2.census.gov/geo/tiger/TIGER2015/CD/tl_2015_us_cd114.zip
unzip data/tl_2015_us_cd114.zip
ogr2ogr -f GeoJSON -t_srs crs:84 data/map_data.geojson data/tl_2015_us_cd114.shp

# run processing on data
node process.js data/map_data.geojson

# create Mapbox vector tiles from data
tippecanoe -o data/congress12.mbtiles -f -z 12 -Z 0 -pS -pp -l districts -n "US Congressional Districts" data/map.geojson

# upload map data to Mapbox.com
node upload.js data/congress.mbtiles data/map_labels.geojson style.json $MAPBOX_USERNAME $MAPBOX_WRITE_SCOPE_ACCESS_TOKEN

# modify website/index.html to use your Mapbox account
sed -i -e "s/USER/$MAPBOX_USERNAME/g" website/index.html
sed -i -e "s/ACCESS_TOKEN/$MAPBOX_DEFAULT_ACCESS_TOKEN/g" website/index.html
```

Check out [mapbox.com/studio](https://www.mapbox.com/studio) to see updates on data processing. Once Mapbox is finished processing our upload

#### Usage:

After setup, `index.html` will be a full page web map of US Congressional districts.

Show specific congressional districts using the url hash.

To show districts in the state of Virginia: `http://localhost:8000/#state=VA`

To show the 5th district of Illinois: `http://localhost:8000/#state=IL&district=05`
