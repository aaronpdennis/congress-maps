#!/bin/bash

wget -O data/townhallproject.csv https://docs.google.com/spreadsheets/u/1/d/1yq1NT9DZ2z3B8ixhid894e77u9rN5XIgOwWtTW72IYA/export?format=csv&sle=true#gid=1473996386
tail -n +11 data/townhallproject.csv | sed -e '1s/State/CState/;t' -e '1,/State/s//CState/' > data/townhallproject-trimmed.csv
node_modules/csvtojson/bin/csvtojson data/townhallproject-trimmed.csv > data/townhallproject.json

#rm data townhallproject.csv
#rm data townhallproject-trimmed.csv
