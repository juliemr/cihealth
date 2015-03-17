var request = require('request');
var q = require('q');
var fs = require('fs');
var diagnose = require('./diagnose.js').diagnose;

/**
 * Run to output a job info file to jobhistory.json. This will download
 * lots of logs to the folder ./logs/
 */

// This is the build number where Socket.io was upgraded. Only go that far back.
var LAST_BUILD_NUMBER = 16958;

var TRAVIS_HEADERS = {
  Accept: 'application/vnd.travis-ci.2+json',
  'User-Agent': 'AngularCiHealth'
}

var OUTFILE = 'jobhistory.json';

var builds = [];
var jobIds = [];

var jobHistory = {};

var diagnoseJob = function(jobInfo) {
  var logFile = 'logs/' + jobInfo.id + '.txt'
  var haveLogDeferred = q.defer();

  if (!fs.existsSync(logFile)) {
    var writer = fs.createWriteStream(logFile);
    writer.on('finish', function() {
      process.stdout.write('-');
      haveLogDeferred.resolve();
    });

    request({
      url: 'http://api.travis-ci.org/jobs/' + jobInfo.id + '/log.txt',
      headers: {
        'User-Agent': 'AngularCiHealth',
        Accept: 'text/plain'
      }
    }).on('error', function() {
      console.log('error downloading log ' + jobInfo.id);
      haveLogDeferred.resolve();
    }).pipe(writer);
  } else {
    process.stdout.write('_');
    haveLogDeferred.resolve();
  }

  return haveLogDeferred.promise.then(function() {
    return diagnose(jobInfo, logFile);
  });
};

var getJob = function(jobId) {
  var deferred = q.defer();
  request({
    url: 'http://api.travis-ci.org/jobs/' + jobId,
    headers: TRAVIS_HEADERS
  }, function(error, response, body) {
    process.stdout.write('.');
    var job = JSON.parse(body).job;
    if (!jobHistory[job.config.env]) {
      jobHistory[job.config.env] = [];
    }

    var jobInfo = {
      id: job.id,
      log_id: job.log_id,
      build_id: job.build_id,
      number: job.number,
      state: job.state,
      started_at: job.started_at
    }
    jobHistory[job.config.env].push(jobInfo);
    diagnoseJob(jobInfo).then(function() {
      deferred.resolve()
    }, function(err) {
      console.log('error diagnosing job ' + jobInfo.id);
      console.dir(err);
      deferred.reject(err);
    });
  });
  return deferred.promise;
};

var getJobs = function(builds) {
  for (var i = 0; i < builds.length; ++i) {
    if (parseInt(builds[i].number) > LAST_BUILD_NUMBER) {
      jobIds = jobIds.concat(builds[i].job_ids);
    }
  }
  console.log('Getting job info and logs for ' + jobIds.length + ' jobs');
  // TODO - don't grab info again from jobs we've already processed
  // if there's already a jobhistory.json file.
  jobPromises = [];
  for (var j = 0; j < jobIds.length; ++j) {
    jobPromises.push(getJob(jobIds[j]));
  }
  q.all(jobPromises).then(function() {
    console.log('---- Job History ----');
    console.dir(jobHistory);
    fs.writeFileSync(OUTFILE, JSON.stringify(jobHistory));
  }, function(err) {
    console.log('Error');
    console.dir(err);
  });
};

var getBuilds = function(afterNumber) {
  var qs = {};
  if (afterNumber) {
    qs.after_number = afterNumber;
  }
  request({
    url: 'http://api.travis-ci.org/repos/angular/angular.js/builds',
    qs: qs,
    headers: TRAVIS_HEADERS
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      // Seems to always get 25 builds.
      var newBuilds = JSON.parse(body).builds;
      builds = builds.concat(newBuilds);
      if (parseInt(builds[builds.length - 1].number) > LAST_BUILD_NUMBER) {
        console.log('Getting 25 more builds');
        getBuilds(builds[builds.length - 1].number);
      } else {
        console.log('Got info for ' + builds.length + ' builds');
        getJobs(builds);
      }
    }
  });
};

// Main script starts here.

getBuilds(null);
