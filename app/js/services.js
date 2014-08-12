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
]).factory('api', [
  '$resource',
  'xml2json',
  'uri',
  'options',
  function ($resource, xml2json, uri, options) {
    var Api = function () {
      this.$resource = $resource;
      this.options = options;
      this.xml2json = xml2json.new();
      this.uri = uri;
      this.params = {
        'protocol': options.get('enablePeerSsl') ? 'https' : 'http',
        'hostname': options.get('peerAddress'),
        'port': options.get('peerPort') ? options.get('peerPort') : ''
      };
    };
    Api.prototype = {
      getSearchUrl: function (query) {
        if (!query) {
          return null;
        }
        var uri = this.uri.new(this.params);
        uri.path('yacysearch.html');
        var params = {};
        params.search = query;
        params.urlMaskFilter = options.get('urlMask');
        params.contentdom = options.get('contentType');
        params.count = options.get('maxResult');
        params.resource = options.get('resource');
        params.verify = options.get('enableSnippets');
        uri.search(params);
        return uri.toString();
      },
      crawl: function (url, title) {
        if (!url || !title) {
          return null;
        }
        var params = this.params;
        params.url = url;
        params.title = title;
        params.crawlingDepth = options.get('crawlingDepth');
        params.localIndexing = !options.get('enableRemoteIndexing');
        params.xdstopw = options.get('enableStaticStopWordsExclusion');
        params.storeHTCache = options.get('enableProxyCacheStoring');
        params.crawlingQ = options.get('enableDynamicUrls');
        return this.$resource(':protocol://:hostname' + ':' + ':port/QuickCrawlLink_p.xml?url=:url&title=:title&crawlingDepth=:crawlingDepth&localIndexing=:localIndexing&xdstopw=:xdstopw&storeHTCache=:storeHTCache&crawlingQ=:crawlingQ', params, {
          get: {
            method: 'GET',
            transformResponse: function (data) {
              var response = {};
              var extractedMessage = /<status\s*code="(\d*)">((?:.|[\s\S])+?)<\/status>/gm.exec(data);
              response.code = !extractedMessage || typeof extractedMessage[1] === undefined ? -1 : parseInt(extractedMessage[1].trim());
              response.message = !extractedMessage || typeof extractedMessage[2] === undefined ? 'Request failed' : extractedMessage[2].trim();
              return response;
            }
          }
        }).get();
      },
      blacklist: function (url, name) {
        if (!url || !name) {
          return null;
        }
        var params = this.params;
        params.currentBlacklist = name;
        params.newEntry = url;
        return this.$resource(':protocol://:hostname' + ':' + ':port/Blacklist_p.html?addBlacklistEntry=&currentBlacklist=:currentBlacklist&newEntry=:newEntry', params).get();
      },
      getBlacklistNames: function () {
        var params = this.params;
        var xml2json = this.xml2json;
        return this.$resource(':protocol://:hostname' + ':' + ':port/api/blacklists_p.xml?attrOnly=1', params, {
          get: {
            method: 'GET',
            transformResponse: function (data) {
              var response = {};
              try {
                var jsonData = xml2json.xml_str2json(data); // jshint ignore:line
                var list = [];
                try {
                  list = jsonData.blacklists.list;
                } catch (e) {
                }
                if (!(list instanceof Array) && list !== undefined) {
                  list = [ list ];
                }
                for (var i = 0; i < list.length; i++) {
                  response[i] = list[i]._name;
                }
              } catch (e) {
                console.log(e);
              }
              return response;
            }
          }
        }).get();
      }
    };
    return new Api();
  }
]);



