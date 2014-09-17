/*global chrome:false */
/*global URI:false */
/*global X2JS:false */
'use strict';
/* Services */
angular.module('yacy.services', []).factory('chrome', function () {
  return chrome;
}).factory('storage', function () {
  var Storage = function () {
  };
  var qualify = function (area, key) {
    return typeof(area) !== 'string' ? key : area + '.' + key;
  };
  
  var watched = {
  };
  var eventListenerAdded = false;
  var watchCallBack = function (ev) {
    if (ev.key in watched) {
      watched[ev.key].fn( watched[ev.key].key, angular.fromJson(ev.newValue));
    }
  };
  Storage.prototype = {
    set: function (key, value, area) {
      localStorage.setItem(qualify(area, key), angular.toJson(value));
    },
    get: function (key, area) {
      var got = localStorage.getItem(qualify(area, key));
      return got === 'undefined' ? undefined : angular.fromJson(got);
    },
    remove: function (key, area) {
      localStorage.removeItem(qualify(area, key));
    },
    has: function (key, area) {
      return localStorage.getItem(qualify(area, key)) === null ? false : true;
    },
    watch: function (key, fn, area) {
      var k = qualify(area, key);
      if (!eventListenerAdded) {
        addEventListener('storage', watchCallBack, false);
        eventListenerAdded = true;
      }
      watched[k] = {
        fn : fn,
        key : key
      };
    }
  };
  return new Storage();
}).factory('uri', function () {
  return {
    new: function (args) {
      return new URI(args);
    }
  };
}).factory('xml2json', function () {
  return {
    new: function () {
      return new X2JS();
    }
  };
}).factory('options', [
  'storage',
  function (storage) {
    var storageArea = 'options';
    var options = {};
    var optionChangeCB = null;
    var defaultOptions = {
      // peer settings
      'peerAddress': 'localhost',
      'peerPort': 8090,
      'enablePeerSsl': false,
      'peerUsername': null,
      'peerPassword': null,
      // crawler settings
      'autoCrawl': false,
      'enableCrawlerSettings': true,
      'crawlingFilter': '.*',
      'crawlingDepth': 0,
      'enableDynamicUrls': false,
      'enableProxyCacheStoring': false,
      'enableRemoteIndexing': false,
      'enableStaticStopWordsExclusion': false,
      // search settings
      'searchType': 'standard',
      'contentType': 'text',
      'maxResult': 10,
      'resource': 'global',
      'urlMask': '.*',
      'enableSnippets': false,
      // general settings
      'enableSearchPageAsStartPage': false,
      'enableMessageNotification': false,
      'enableCrawlerNotification': false,
      'enableNewsNotification': false
    };
    var cb = function (key, newVal) {
      if (options[key] !== newVal) {
        options[key] = newVal;
        if (optionChangeCB !== null) {
          optionChangeCB();
        }
      }
    };
    for (var key in defaultOptions) {
      if (!storage.has(key, storageArea)) {
        storage.set(key, defaultOptions[key], storageArea);
      }
      options[key] = storage.get(key, storageArea);
      storage.watch(key, cb, storageArea);
    }

    return({
      'options' : options,
      'defaults' : defaultOptions,
      'save' : function (key, value) {
        if (value !== storage.get(key, storageArea)) {
          storage.set(key, value, storageArea);
        }
      },
      'get' : function (key) {
        return options[key];
      },
      'setOptionChangeCallBack' : function (cb) {
        optionChangeCB = cb;
      }
    });
  }
]);
