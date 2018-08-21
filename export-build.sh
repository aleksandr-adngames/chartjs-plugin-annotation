#!/bin/bash

BUILDS_PATH=../lambo-components-builds
BUILD_NAME=chartjs-plugin-annotation
BUILD_DEST="$BUILDS_PATH/$BUILD_NAME"

#create build
npm run build

#copy build
if [ -d "$BUILD_DEST" ]; then
  rm -rf "$BUILD_DEST"
fi

mkdir "$BUILD_DEST"

cp -r "./chartjs-plugin-annotation.js" "$BUILD_DEST/index.js"
cp -r "./chartjs-plugin-annotation.min.js" "$BUILD_DEST/index.min.js"
