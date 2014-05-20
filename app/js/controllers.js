'use strict';
/* Controllers */
angular.module('yacy.controllers', []).controller('OptionsCtrl', [
  '$scope',
  'options',
  function ($scope, options) {
    $scope.options = options.options;
    $scope.init = function () {
      var watchModelChange = function (key) {
        $scope.$watch('options.' + key, function (value) {
          options.save(key, value);
        }, true);
      };
      for (var key in options.options) {
        watchModelChange(key);
      }
      options.setOptionChangeCallBack(function() {
        $scope.$apply();
      });
    };
    $scope.reset = function () {
      for (var key in options.defaults) {
        $scope.options[key] = options.defaults[key];
      }
    };
  }
]).controller('BrowserActionCtrl', [
  '$scope',
  'chrome',
  'uri',
  'api',
  function ($scope, chrome, uri, api) {
    $scope.currentUrl = null;
    $scope.title = null;
    $scope.blacklistUrl = null;
    $scope.blacklistName = null;
    $scope.blacklistNames = null;
    $scope.crawlUrl = null;
    $scope.crawlingStatus = null;
    $scope.init = function () {
      $scope.blacklistNames = api.getBlacklistNames();
      $scope.blacklistNames.$promise.then(function (data) {
        $scope.blacklistName = data['0'];
      });
      chrome.tabs.query({
        'active': true,
        'status': 'complete',
        'highlighted': true
      }, function (tabs) {
        $scope.title = tabs[0].title;
        $scope.currentUrl = tabs[0].url;
        $scope.blacklistUrl = $scope.currentUrl;
        $scope.crawlUrl = $scope.currentUrl;
      });
    };
    $scope.resetCrawl = function () {
      $scope.crawlUrl = $scope.currentUrl;
    };
    $scope.submitCrawl = function () {
      if ($scope.crawlUrl && $scope.title !== null) {
        $scope.crawlingStatus = api.crawl($scope.crawlUrl, $scope.title);
        return true;
      }
      return false;
    };
    $scope.resetBlacklist = function () {
      $scope.blacklistUrl = $scope.currentUrl;
    };
    $scope.submitBlacklist = function () {
      if ($scope.blacklistUrl && $scope.blacklistName) {
        api.blacklist($scope.blacklistUrl, $scope.blacklistName);
        return true;
      }
      return false;
    };
    $scope.filterDomain = function () {
      $scope.blacklistUrl = uri.new($scope.currentUrl).hostname() + '/.*';
    };
    $scope.filterSubDomain = function () {
      $scope.blacklistUrl = '.*' + uri.new($scope.currentUrl).domain() + '/.*';
    };
  }
]).controller('BackgroundActionCtrl', [
  '$scope',
  'chrome',
  'uri',
  'api',
  function ($scope, chrome, uri, api) {
    $scope.init = function () {
      chrome.omnibox.onInputEntered.addListener(function (query) {
        chrome.tabs.create({ url: api.getSearchUrl(query) });
      });
    };
  }
]);
