#!/bin/bash

BRANCH=${BRANCH:-$(git branch --show-current)}
TARGET_DOMAIN="$BRANCH--surmblog.netlify.app"
if [ "$BRANCH" = "master" ]; then
  TARGET_DOMAIN="surma.dev"
fi

export TARGET_DOMAIN
export BRANCH

PUBLIC_URL=${PUBLIC_URL:-"https://${TARGET_DOMAIN}"}
npx eleventy
cd .tmp
npm i
npx parcel build index.html --dist-dir ../_site --public-url "${PUBLIC_URL}"
