var request = require('request');

// This is the build number where Socket.io was upgraded. Only go that far back.
var LAST_BUILD_NUMBER = 16958;

var builds = [];

var getBuilds = function(afterNumber) {
  var qs = {};
  if (afterNumber) {
    qs.after_number = afterNumber;
  }


  request({
    url: 'http://api.travis-ci.org/repos/angular/angular.js/builds',
    qs: qs,
    Accept: 'application/vnd.travis-ci.2+json'},
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        // Seems to always get 25 builds.
        var newBuilds = JSON.parse(body);
        // console.dir(newBuilds);
        builds = builds.concat(newBuilds);
        if (parseInt(builds[builds.length - 1].number) > LAST_BUILD_NUMBER) {
          console.dir('Getting 25 more');
          console.dir(builds[builds.length - 1].number);
          getBuilds(builds[builds.length - 1].number);
        } else {
          console.dir(builds);
          console.dir('----');
          console.dir(builds.length);
        }
      }
    })
};

getBuilds(null);
