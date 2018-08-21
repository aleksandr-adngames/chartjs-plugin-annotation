#!/bin/bash

BUILDS_PATH=../lambo-components-builds
BUILD_NAME=chartjs-plugin-annotation
BUILD_DEST="$BUILDS_PATH/$BUILD_NAME"

cd $BUILDS_PATH
git pull
cd ../chartjs-plugin-annotation

sh export-build.sh

cd $BUILDS_PATH
git add "$BUILD_NAME"
COMMIT_MESSAGE="Update $BUILD_NAME build"
git commit -m \""$COMMIT_MESSAGE"\"
git push
