hash = require './hash'
cache = {}
disableCache = false
module.exports = 
  addToCache: (endpoint, args, obj) ->
    if not disableCache
      h = hash JSON.stringify args or {}
      if not cache[endpoint]
        cache[endpoint] = {}
      cache[endpoint][h] =  JSON.stringify obj
  fetchFromCache: (endpoint, args) ->
    if not disableCache
      h = hash JSON.stringify args or {}
      if cache[endpoint]
        if cache[endpoint][h]
          str = cache[endpoint][h]
          newvar = JSON.parse str
          return newvar
    return null
  clearCache: (endpoint) ->
    if endpoint
      delete cache[endpoint]
    else
      cache = {}