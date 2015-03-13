var q = require('q');
var exec = require('child_process').exec;


// TODO - consider looking at the final lines of the output to see which
// browsers are being problematic.

// Note that the order here matters - the diagnoser will find the first
// error and report that one, ignoring later matches.
var STATES = [{
    regexp: 'NoSuchWindowError',
    state: 'NoSuchWindowError'
  }, {
    regexp: 'Disconnected (3 times)',
    state: 'Karma disconnected more than 2 times'
  }, {
    regexp: 'WARN \[launcher.browserstack\]: .* has not captured in 60000 ms, killing',
    state: 'BrowserStack could not capture browser'
  }, {
    regexp: 'UnknownCommandError: ERROR Job is not in progress',
    state: 'Job is not in progress - usually means absolutely everything timed out'
  }, {
    regexp: 'UnknownError: Could not start Browser / Emulator',
    state: 'Could not start Browser / Emulator',
  }, {
    regexp: 'No output has been received in the last 10 minutes',
    state: 'No output received in the last 10 minutes - sometimes tunnel failure'
  }, {
    regexp: 'Protractor.waitForAngular()',
    state: 'Timed out while a spec was waiting for Angular'
  }, {
    regexp: 'Timed out awaiting response to command \"switchToFrame\"',
    state: 'Timed out switching frames'
  }, {
    regexp: 'timeout: timed out after 60000 msec waiting for spec to complete',
    state: 'A jasmine spec took longer than 60 sec'
  }];

var getGrepCmd = function(logFile, regexp) {
  return 'grep ' + logFile + ' --count --regexp="' + regexp + '"';
};

var tryState = function(index, logFile) {
  if (index >= STATES.length) {
    return q('other failure');
  }

  var deferred = q.defer();

  var child = exec(getGrepCmd(logFile, STATES[index].regexp),
      function(error, stdout, stderr) {
        // grep outputs error code 1 if no matches, so continue
        if (stderr || (error && error.code === 1)) {
          tryState(index + 1, logFile).then(deferred.fulfill);
        } else {
          // There were some matches
          deferred.fulfill(STATES[index].state);
        }
      });
  return deferred.promise;
}

/**
 * Given job info with a log file, attempts to figure out the status of
 * the job.
 */
exports.diagnose = function(jobInfo, logFile) {
  if (jobInfo.state === 'passed') {
    jobInfo.advancedState = 'pass';
    return q(true);
  } else if (jobInfo.state === 'started') {
    jobInfo.advancedState = 'running';
    return q(true);
  } else {
    return tryState(0, logFile).then(function(advancedState) {
      jobInfo.advancedState = advancedState;
    });
  }
}
