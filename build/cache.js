(function() {
  var cache, disableCache, hash;

  hash = require('./hash');

  cache = {};

  disableCache = false;

  module.exports = {
    addToCache: function(endpoint, args, obj) {
      var h;
      if (!disableCache) {
        h = hash(JSON.stringify(args || {}));
        if (!cache[endpoint]) {
          cache[endpoint] = {};
        }
        return cache[endpoint][h] = JSON.stringify(obj);
      }
    },
    fetchFromCache: function(endpoint, args) {
      var h, newvar, str;
      if (!disableCache) {
        h = hash(JSON.stringify(args || {}));
        if (cache[endpoint]) {
          if (cache[endpoint][h]) {
            str = cache[endpoint][h];
            newvar = JSON.parse(str);
            return newvar;
          }
        }
      }
      return null;
    },
    clearCache: function(endpoint) {
      if (endpoint) {
        return delete cache[endpoint];
      } else {
        return cache = {};
      }
    }
  };

}).call(this);

//# sourceMappingURL=cache.js.map
