#!/bin/bash

set -e

BRANCH=$(echo ${BRANCH:-$(git branch --show-current)} | sed -r 's!/!-!g')
TARGET_DOMAIN="$BRANCH--surmblog.netlify.app"
if [ "$BRANCH" = "master" ]; then
  TARGET_DOMAIN="surma.dev"
fi

export TARGET_DOMAIN
export BRANCH

PUBLIC_URL=${PUBLIC_URL:-"https://${TARGET_DOMAIN}"}
npx eleventy
npx vite build
