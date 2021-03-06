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
        'highlighted': true,
        'currentWindow': true
      }, function (tabs) {
        if (tabs && tabs.length) {
          $scope.title = tabs[0].title;
          $scope.currentUrl = tabs[0].url;
          $scope.blacklistUrl = $scope.currentUrl;
          $scope.crawlUrl = $scope.currentUrl;
        }
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
  'options',
  function ($scope, chrome, uri, api, options) {
    $scope.init = function () {
      chrome.omnibox.onInputEntered.addListener(function (query) {
        chrome.tabs.create({ url: api.getSearchUrl(query) });
      });

      // auto crawl related
      $scope.options = options.options;
      var tabs = {};

      var isTabReady = function (tab) {
        var currentUrl = tabs[tab.id] ? tabs[tab.id].url : undefined;
        // filter chrome local urls
        if (tab.url && tab.url.lastIndexOf('chrome', 0) === 0) {
          return false;
        }
        return (currentUrl !== tab.url && tab.url && (tab.title || tab.status === 'complete'));
      };

      // respond to change in tab url
      var respond = function (tab) {
        var crawled = false;
        if (isTabReady(tab)) {
          if (options.get('autoCrawl')) {
            api.crawl(tab.url, tab.title);
            crawled = true;
          }
          tabs[tab.id] = { url : tab.url, crawled : crawled, title : tab.title };
        }
      };

      // setup listeners for tab events
      chrome.tabs.onCreated.addListener(function (tab) {
        respond(tab);
      });
      chrome.tabs.onUpdated.addListener(function (_tabid, _changeInfo, tab) {
        respond(tab);
      });
      chrome.tabs.onRemoved.addListener(function (tabid) {
        delete tabs[tabid];
      });

      // respond to changes in autoCrawl settings
      $scope.$watch('options.autoCrawl', function (active) {
        if (active) {
          // first clear every uncrawled tab in our list
          angular.forEach(tabs, function (tabid, data) {
            if (data.crawled === false) {
              api.crawl(data.url, data.title);
              data.crawled = true;
            }
          });
          // query all the tabs and add them to our list
          chrome.tabs.query({}, function (tabsFromQuery) {
            for (var i=0; i<tabsFromQuery.length; i++) {
              respond(tabsFromQuery[i]);
            }
          });
        }
      }, true);

    };
  }
]);
