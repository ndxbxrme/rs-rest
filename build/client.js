(function() {
  var angular, cache, moduleName, specialProps, throttle, throttleTime;

  angular = window.angular || require('angular');

  moduleName = 'rs-rest';

  throttle = require('./throttle');

  cache = require('./cache');

  specialProps = require('./special-props');

  throttleTime = 200;

  angular.module(moduleName, []).factory('rest', function($http, $injector) {
    var endpoints, loading, socket, socketFetch, startLoading, stopLoading;
    socket = null;
    if ($injector.has('socket')) {
      socket = $injector.get('socket');
    }
    endpoints = {};
    loading = 0;
    startLoading = function() {
      return loading++;
    };
    stopLoading = function() {
      return loading = Math.max(loading - 1, 0);
    };
    socketFetch = function(data) {
      cache.clearCache(data.table);
      return endpoints[data.table].fetch(true);
    };
    if (socket) {
      socket = $injector.get('socket');
      socket.on('update', socketFetch);
      socket.on('insert', socketFetch);
      socket.on('delete', socketFetch);
    }
    return {
      save: function(endpoint, obj, cb) {
        startLoading();
        return $http.post(`/api/${endpoint}/${obj._id || ''}`, obj).then(function(response) {
          socket || endpoints[endpoint].fetch();
          stopLoading();
          return typeof cb === "function" ? cb(obj) : void 0;
        }, function(err) {
          stopLoading();
          return typeof cb === "function" ? cb(obj) : void 0;
        });
      },
      'delete': function(endpoint, obj) {
        startLoading();
        return $http.delete(`/api/${endpoint}/${obj._id || ''}`, obj).then(function(response) {
          socket || endpoints[endpoint].fetch();
          stopLoading();
          return typeof cb === "function" ? cb(obj) : void 0;
        }, function(err) {
          stopLoading();
          return typeof cb === "function" ? cb(obj) : void 0;
        });
      },
      search: function(endpoint, items, isSocket, cb) {
        var handleResponse, response;
        isSocket || startLoading();
        handleResponse = function(response) {
          var clonedProps, i, item, len, ref;
          clonedProps = null;
          if (items && items.length) {
            clonedProps = specialProps.clone(items);
          }
          items.length = 0;
          if (response.items) {
            ref = response.items;
            for (i = 0, len = ref.length; i < len; i++) {
              item = ref[i];
              items.push(item);
            }
            if (clonedProps) {
              specialProps.restore(items, clonedProps);
            }
          }
          items.$total = response.total;
          isSocket || stopLoading();
          return typeof cb === "function" ? cb(items) : void 0;
        };
        if (response = cache.fetchFromCache(endpoint, items.$args)) {
          return handleResponse(response);
        } else {
          return $http.post('/api/' + endpoint + '/search', items.$args).then(function(res) {
            if (res.status === 200) {
              cache.addToCache(endpoint, items.$args, res.data);
              return handleResponse(res.data);
            }
          }, function() {
            items.length = 0;
            items.$total = 0;
            isSocket || stopLoading();
            return typeof cb === "function" ? cb(items) : void 0;
          });
        }
      },
      single: function(endpoint, id, item, isSocket, cb) {
        var handleResponse, response;
        isSocket || startLoading();
        handleResponse = function(response) {
          var clonedProps, key;
          isSocket || stopLoading();
          clonedProps = null;
          if (item && Object.keys(item).length) {
            clonedProps = specialProps.clone(item);
            for (key in item) {
              delete item[key];
            }
          }
          if (response) {
            for (key in response) {
              item[key] = response[key];
            }
          }
          if (item && clonedProps) {
            specialProps.restore(item, clonedProps);
          }
          return typeof cb === "function" ? cb(item) : void 0;
        };
        if (typeof id === 'object') {
          id = escape(JSON.stringify(id));
        }
        if (response = cache.fetchFromCache(endpoint, {
          id: id
        })) {
          return handleResponse(response);
        } else {
          return $http.get(`/api/${endpoint}/${id}${(item.$all ? '/all' : '')}`).then(function(response) {
            cache.addToCache(endpoint, {
              id: id
            }, response.data);
            return handleResponse(response.data);
          }, function(err) {
            isSocket || stopLoading();
            return typeof cb === "function" ? cb(item) : void 0;
          });
        }
      },
      add: function(endpoint, obj) {
        endpoints[endpoint] = endpoints[endpoint] || {
          objs: [],
          fetch: throttle(function(isSocket) {
            var i, len, ref, results;
            ref = endpoints[endpoint].objs;
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              obj = ref[i];
              results.push(obj.$fetch(isSocket));
            }
            return results;
          }, throttleTime, true)
        };
        return endpoints[endpoint].objs.push(obj);
      },
      remove: function(endpoint, obj) {
        return endpoints[endpoint].objs.splice(endpoints[endpoint].objs.indexOf(obj), 1);
      }
    };
  }).run(function($rootScope, $http, $timeout, rest) {
    $rootScope.$list = function(endpoint, args, cb) {
      var callback, callbacks, deref, items, loadCount;
      loadCount = 0;
      callbacks = {};
      callback = function(name, obj) {
        var i, len, ref, results;
        if (callbacks[name]) {
          ref = callbacks[name];
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            cb = ref[i];
            results.push(cb(obj));
          }
          return results;
        }
      };
      items = [];
      items.$args = args;
      items.$fetch = function(isSocket) {
        if (items.$locked) {
          return;
        }
        return rest.search(endpoint, items, isSocket, function() {
          loadCount++;
          if (loadCount === 1) {
            callback('firstload', items);
          }
          return callback('load', items);
        });
      };
      items.$save = function(item, checkFn) {
        if (checkFn) {
          return checkFn('save', endpoint, item).then(function() {
            return rest.save(endpoint, item, function() {
              return callback('save', item);
            });
          });
        } else {
          return rest.save(endpoint, item, function() {
            return callback('save', item);
          });
        }
      };
      items.$on = function(name, fn) {
        callbacks[name] = callbacks[name] || [];
        return callbacks[name].push(fn);
      };
      rest.add(endpoint, items);
      deref = this.$watch(function() {
        return items.$args;
      }, items.$fetch, true);
      this.$on('$destroy', function() {
        deref();
        return rest.remove(endpoint, items);
      });
      return items;
    };
    return $rootScope.$single = function(endpoint, id, cb) {
      var callback, callbacks, item, loadCount;
      loadCount = 0;
      callbacks = {};
      callback = function(name, obj) {
        var i, len, ref, results;
        if (callbacks[name]) {
          ref = callbacks[name];
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            cb = ref[i];
            results.push(cb(obj));
          }
          return results;
        }
      };
      item = {};
      item.$fetch = function(isSocket) {
        if (item.$locked) {
          return;
        }
        return rest.single(endpoint, id, item, isSocket, function() {
          loadCount++;
          if (loadCount === 1) {
            callback('firstload', item);
          }
          return callback('load', item);
        });
      };
      item.$save = function(checkFn) {
        if (checkFn) {
          return checkFn('save', endpoint, item).then(function() {
            return rest.save(endpoint, item, function() {
              return callback('save', item);
            });
          });
        } else {
          return rest.save(endpoint, item, function() {
            return callback('save', item);
          });
        }
      };
      item.$on = function(name, fn) {
        callbacks[name] = callbacks[name] || [];
        return callbacks[name].push(fn);
      };
      rest.add(endpoint, item);
      this.$on('$destroy', function() {
        return rest.remove(endpoint, item);
      });
      item.$fetch();
      return item;
    };
  });

  module.exports = moduleName;

}).call(this);

//# sourceMappingURL=client.js.map
