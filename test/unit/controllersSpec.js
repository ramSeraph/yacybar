/*global chromeMock:false */
'use strict';
/* jasmine specs for controllers go here */
describe('controllers', function () {
  describe('OptionsCtrl', function () {
    beforeEach(module('yacy.controllers', 'yacy.services'));
    var scope, ctrl, options;
    beforeEach(inject(function ($rootScope, $controller, _options_) {
      scope = $rootScope.$new();
      options = _options_;
      ctrl = $controller('OptionsCtrl', {
        $scope: scope,
        options: options
      });
    }));

    it('should see default options when started for the first time', function () {
      scope.init();
      expect(scope.options['peerAddress']).toEqual('localhost');
      expect(scope.options['peerPort']).toEqual(8090);
      expect(scope.options['enableDynamicUrls']).toEqual(false);
    });

    it('should save changes', function () {
      scope.init();
      spyOn(options, 'save').andCallThrough();
      scope.$apply( function() {
        scope.options['peerAddress'] = '127.0.0.1';
        scope.options['peerPort'] = 10000;
        scope.options['enableDynamicUrls'] = true;
      });
      expect(options.save).toHaveBeenCalledWith('peerAddress', '127.0.0.1');
      expect(options.save).toHaveBeenCalledWith('peerPort', 10000);
      expect(options.save).toHaveBeenCalledWith('enableDynamicUrls', true);
    });

    it('should fall back to defaults on reset', function () {
      scope.init();
      spyOn(options, 'save').andCallThrough();
      scope.$apply( function() {
        scope.reset();
      });
      expect(options.save).toHaveBeenCalledWith('peerAddress', 'localhost');
      expect(options.save).toHaveBeenCalledWith('peerPort', 8090);
      expect(options.save).toHaveBeenCalledWith('enableDynamicUrls', false);
      expect(scope.options['peerAddress']).toEqual('localhost');
      expect(scope.options['peerPort']).toEqual(8090);
      expect(scope.options['enableDynamicUrls']).toEqual(false);
    });
  });
  describe('BrowserActionCtrl', function () {
    var scope, chrome, $httpBackend;
    beforeEach(module('ngResource', 'yacy.controllers', 'yacy.services'));
    beforeEach(inject(function ($rootScope, $controller, _uri_, _api_, _$httpBackend_) {
      scope = $rootScope.$new();
      chrome = chromeMock;
      $httpBackend = _$httpBackend_;
      $controller('BrowserActionCtrl', {
        $scope: scope,
        uri: _uri_,
        chrome: chrome,
        api: _api_
      });
      chrome.mock.tabs = [{
          active: true,
          'favIconUrl': 'http://www.example.com/favicon.ico',
          'highlighted': true,
          'id': 16,
          'incognito': false,
          'index': 0,
          'pinned': false,
          'selected': true,
          'status': 'complete',
          'title': 'title page',
          'url': 'http://www.example.com/anyurl.html',
          windowId: 1
        }];
    }));
    it('should have first item in blacklist list chosen', function () {
      $httpBackend.whenGET('http://localhost:8090/api/blacklists_p.xml?attrOnly=1').respond('<?xml version="1.0" ?><blacklists><list crawler="1" dht="1" name="url.default.black" news="1" proxy="1" search="1" shared="1" surftips="1"></list><list crawler="1" dht="1" name="hello_world.black" news="1" proxy="1" search="1" shared="1" surftips="1"></list></blacklists>');
      scope.init();
      $httpBackend.flush();
      expect(scope.blacklistName).toEqual('url.default.black');
    });
    it('should be equal to null if no blacklists are grabbed', function () {
      $httpBackend.whenGET('http://localhost:8090/api/blacklists_p.xml?attrOnly=1').respond('');
      scope.init();
      $httpBackend.flush();
      expect(scope.blacklistName).toEqual(undefined);
    });
    it('should have current url to init blacklist url', function () {
      scope.init();
      expect(scope.blacklistUrl).toEqual('http://www.example.com/anyurl.html');
    });
    it('should have current url to init crawling url', function () {
      scope.init();
      expect(scope.crawlUrl).toEqual('http://www.example.com/anyurl.html');
    });
    it('should filter domain', function () {
      scope.init();
      scope.filterDomain();
      expect(scope.blacklistUrl).toEqual('www.example.com/.*');
    });
    it('should filter subdomain', function () {
      scope.init();
      scope.filterSubDomain();
      expect(scope.blacklistUrl).toEqual('.*example.com/.*');
    });
    it('should reset crawl url if changed', function () {
      scope.init();
      scope.crawlUrl = 'http://whatever.com';
      scope.resetCrawl();
      expect(scope.crawlUrl).toEqual('http://www.example.com/anyurl.html');
    });
    it('should reset blacklist url if changed', function () {
      scope.init();
      scope.blacklistUrl = 'http://whatever.com';
      scope.resetBlacklist();
      expect(scope.blacklistUrl).toEqual('http://www.example.com/anyurl.html');
    });
    it('should not crawl if not enough informations are provided', function () {
      scope.init();
      scope.crawlUrl = null;
      expect(scope.submitCrawl()).toBeFalsy();
      scope.title = null;
      expect(scope.submitCrawl()).toBeFalsy();
    });
    it('should not blacklist if not enough informations are provided', function () {
      scope.init();
      scope.blacklistUrl = null;
      expect(scope.submitBlacklist()).toBeFalsy();
      scope.blacklistName = 'any name';
      expect(scope.submitBlacklist()).toBeFalsy();
    });
    it('should crawl an url', function () {
      scope.crawlUrl = 'http://whatever.com';
      scope.title = 'a title';
      $httpBackend.expectGET('http://localhost:8090/QuickCrawlLink_p.xml?url=http:%2F%2Fwhatever.com&title=a%20title&crawlingDepth=0&localIndexing=true&xdstopw=false&storeHTCache=false&crawlingQ=false').respond('200');
      expect(scope.submitCrawl()).toBeTruthy();
      $httpBackend.flush();
    });
    it('should blacklist an url', function () {
      scope.blacklistUrl = 'http://whatever.com';
      scope.blacklistName = 'blacklist_1';
      $httpBackend.expectGET('http://localhost:8090/Blacklist_p.html?addBlacklistEntry=&currentBlacklist=blacklist_1&newEntry=http:%2F%2Fwhatever.com').respond('200');
      expect(scope.submitBlacklist()).toBeTruthy();
      $httpBackend.flush();
    });
  });
  describe('BackgroundActionCtrl', function () {
    var scope, chrome, options, api;
    beforeEach(module('ngResource', 'yacy.controllers', 'yacy.services'));
    beforeEach(inject(function ($rootScope, $controller, _uri_, _api_, _options_) {
      scope = $rootScope.$new();
      chrome = chromeMock;
      options = _options_;
      api = _api_;
      $controller('BackgroundActionCtrl', {
        $scope: scope,
        chrome: chrome,
        uri: _uri_,
        api: _api_,
        options: _options_
      });
      chrome.mock.tabs = [{
          active: true,
          'favIconUrl': 'http://www.example.com/favicon.ico',
          'highlighted': true,
          'id': 16,
          'incognito': false,
          'index': 0,
          'pinned': false,
          'selected': true,
          'status': 'complete',
          'title': 'title page',
          'url': 'http://www.example.com/anyurl.html',
          windowId: 1
        },
        {
          active: true,
          'favIconUrl': 'http://www.example.com/favicon.ico',
          'highlighted': true,
          'id': 17,
          'incognito': false,
          'index': 0,
          'pinned': false,
          'selected': true,
          'status': 'complete',
          'title': 'title page 1',
          'url': 'http://www.example.com/anyurl1.html',
          windowId: 2
        }];
    }));
    it('should crawl all open tabs', function () {
      spyOn(api, 'crawl');
      scope.init();
      scope.$apply(function () {
        scope.options.autoCrawl = true;
      });
      expect(api.crawl).toHaveBeenCalledWith('http://www.example.com/anyurl.html', 'title page');
      expect(api.crawl).toHaveBeenCalledWith('http://www.example.com/anyurl1.html', 'title page 1');
    });
  });
});
