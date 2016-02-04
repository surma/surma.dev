import cssLoader from 'modules/defer-css';
cssLoader();

import fontLoader from 'modules/font-loader';
fontLoader([
  'https://fonts.googleapis.com/css?family=Open+Sans+Condensed:300,700',
  'https://fonts.googleapis.com/css?family=Open+Sans:400,700,400italic',
  'https://fonts.googleapis.com/css?family=Source+Code+Pro'
]);

import 'modules/background-color';
