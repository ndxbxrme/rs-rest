angular = window.angular or require 'angular'
moduleName = 'rs-rest'
throttle = require './throttle'
cache = require './cache'
specialProps = require './special-props'
throttleTime = 200
angular.module moduleName, []
.factory 'rest', ($http, $injector) ->
  socket = null
  if $injector.has 'socket'
    socket = $injector.get 'socket'
  endpoints = {}
  loading = 0
  startLoading = ->
    loading++
  stopLoading = ->
    loading = Math.max loading - 1, 0
  socketFetch = (data) ->
    cache.clearCache data.table
    endpoints[data.table].fetch true
  if socket
    socket = $injector.get 'socket'
    socket.on 'update', socketFetch
    socket.on 'insert', socketFetch
    socket.on 'delete', socketFetch
  save: (endpoint, obj, cb) ->
    startLoading()
    $http.post "/api/#{endpoint}/#{obj._id or ''}", obj
    .then (response) ->
      socket or endpoints[endpoint].fetch()
      stopLoading()
      cb? obj
    , (err) ->
      stopLoading()
      cb? obj
  'delete': (endpoint, obj) ->
    startLoading()
    $http.delete "/api/#{endpoint}/#{obj._id or ''}", obj
    .then (response) ->
      socket or endpoints[endpoint].fetch()
      stopLoading()
      cb? obj
    , (err) ->
      stopLoading()
      cb? obj
  search: (endpoint, items, isSocket, cb) ->
    isSocket or startLoading()
    handleResponse = (response) ->
      clonedProps = null
      if items and items.length
        clonedProps = specialProps.clone items
      items.length = 0
      if response.items
        for item in response.items
          items.push item
        if clonedProps
          specialProps.restore items, clonedProps
      items.$total = response.total
      isSocket or stopLoading()
      cb? items
    if response = cache.fetchFromCache endpoint, items.$args
      handleResponse response
    else
      $http.post '/api/' + endpoint + '/search', items.$args
      .then (res) ->
        if res.status is 200
          cache.addToCache endpoint, items.$args, res.data
          handleResponse res.data
      , ->
        items.length = 0
        items.$total = 0
        isSocket or stopLoading()
        cb? items
  single: (endpoint, id, item, isSocket, cb) ->
    isSocket or startLoading()
    handleResponse = (response) ->
      isSocket or stopLoading()
      clonedProps = null
      if item and Object.keys(item).length
        clonedProps = specialProps.clone item
        delete item[key] for key of item
      if response
        item[key] = response[key] for key of response
      if item and clonedProps
        specialProps.restore item, clonedProps
      cb? item
    id = escape JSON.stringify id if typeof(id) is 'object'
    if response = cache.fetchFromCache endpoint, id:id
      handleResponse response
    else
      $http.get "/api/#{endpoint}/#{id}#{if item.$all then '/all' else ''}"
      .then (response) ->
        cache.addToCache endpoint, {id:id}, response.data
        handleResponse response.data
      , (err) ->
        isSocket or stopLoading()
        cb? item
  add: (endpoint, obj) ->
    endpoints[endpoint] = endpoints[endpoint] or
      objs: []
      fetch: throttle (isSocket) ->
        for obj in endpoints[endpoint].objs
          obj.$fetch isSocket
      , throttleTime, true
    endpoints[endpoint].objs.push obj  
  remove: (endpoint, obj) ->
      endpoints[endpoint].objs.splice endpoints[endpoint].objs.indexOf(obj), 1  
.run ($rootScope, $http, $timeout, rest) ->
  $rootScope.$list = (endpoint, args, cb) ->
    loadCount = 0
    callbacks = {}
    callback = (name, obj) ->
      if callbacks[name]
        cb(obj) for cb in callbacks[name]
    items = []
    items.$args = args
    items.$fetch = (isSocket) ->
      return if items.$locked
      rest.search endpoint, items, isSocket, ->
        loadCount++
        callback 'firstload', items if loadCount is 1
        callback 'load', items
    items.$save = (item, checkFn) ->
      if checkFn
        checkFn 'save', endpoint, item
        .then -> rest.save endpoint, item, ->
          callback 'save', item
      else
        rest.save endpoint, item, ->
          callback 'save', item
    items.$on = (name, fn) ->
      callbacks[name] = callbacks[name] or []
      callbacks[name].push fn
    rest.add endpoint, items
    deref = @.$watch ->
      items.$args
    , items.$fetch, true
    @.$on '$destroy', ->
      deref()
      rest.remove endpoint, items
    items
  $rootScope.$single = (endpoint, id, cb) ->
    loadCount = 0
    callbacks = {}
    callback = (name, obj) ->
      if callbacks[name]
        cb(obj) for cb in callbacks[name]
    item = {}
    item.$fetch = (isSocket) ->
      return if item.$locked
      rest.single endpoint, id, item, isSocket, ->
        loadCount++
        callback 'firstload', item if loadCount is 1
        callback 'load', item
    item.$save = (checkFn) ->
      if checkFn
        checkFn 'save', endpoint, item
        .then -> rest.save endpoint, item, ->
          callback 'save', item
      else
        rest.save endpoint, item, ->
          callback 'save', item
    item.$on = (name, fn) ->
      callbacks[name] = callbacks[name] or []
      callbacks[name].push fn
    rest.add endpoint, item
    @.$on '$destroy', ->
      rest.remove endpoint, item
    item.$fetch()
    item
module.exports = moduleName