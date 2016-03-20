# Mapping US Congressional Districts

Process for mapping US congressional districts using US Census boundaries data and Mapbox Studio.

## Mac OS X

#### Dependencies:

```
brew install tippecanoe gdal node
```

#### Setup

First:
```
git clone https://github.com/aaronpdennis/congress-maps.git
cd congress-maps
npm install
```
Then:
```
mkdir data
wget -P data ftp://ftp2.census.gov/geo/tiger/TIGER2015/CD/tl_2015_us_cd114.zip
unzip data/tl_2015_us_cd114.zip
ogr2ogr -f GeoJSON -t_srs crs:84 data/map_data.geojson data/tl_2015_us_cd114.shp
node process.js data/map_data.geojson
tippecanoe -o data/congress12.mbtiles -f -z 12 -Z 0 -pS -pp -l districts -n "US Congressional Districts" data/map.geojson
node upload.js data/congress.mbtiles MAPBOX_USERNAME MAPBOX_ACESS_TOKEN
```

Check out mapbox.com/studio to see updates on data processing. Once Mapbox is finished processing our upload...

#### Usage

After setup, `index.html` will be a full page web map of US Congressional districts.

Show specific congressional districts using the url hash.

To show districts in the state of Virginia: `http://localhost:8888/#state=VA`

To show the 5th district of Illinois: `http://localhost:8888/#state=IL&district=05`
