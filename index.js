var request = require('request');

request({
  url: 'http://api.travis-ci.org/repos/angular/angular.js/builds',
  qs: {
    'after_number': '17051'
  },
  Accept: 'application/vnd.travis-ci.2+json'},
  function(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.dir(JSON.parse(body));
      console.dir(JSON.parse(body).length);
    }
  })
