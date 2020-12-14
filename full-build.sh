#!/bin/bash

TARGET_DOMAIN="${BRANCH:-$(git branch --show-current)}--surmblog.netlify.app"
if [ "$BRANCH" = "master" ]; then
  TARGET_DOMAIN="surma.dev"
fi

export TARGET_DOMAIN

npx eleventy
(
  cd .tmp
  npm i
  npx parcel build --dist-dir ../_site index.html --public-url "https://${TARGET_DOMAIN}"
)