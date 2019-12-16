module.exports = (config) ->
  (rs) ->
    endpoints = rs.config.tables
    rs.get '/rest/endpoints', (req, res) ->
      res.json endpoints
    if rs.socket and rs.db
      rs.db.on 'update', rs.socket.dbFn
      rs.db.on 'insert', rs.socket.dbFn
      rs.db.on 'delete', rs.socket.dbFn
    selectFn = (table, all) ->
      (req, res, next) ->
        where = req.body.where or req.body or {}
        if req.params?.id
          if /^\{/.test req.params.id
            where = JSON.parse req.params.id
          else
            where._id = req.params.id
        if rs.config.softDelete and not req.body.showDeleted and typeof(where.deleted) is 'undefined'
          where.deleted = null
        if req.body.all or all
          req.user.role = null
        if req.params?.id
          res.json await req.db.selectOne table, where
        else
          result = await req.db.select table, where
          res.json 
            items: result
            total: result.total
            page: result.page
            pageSize: result.pageSize
    upsertFn = (table) ->
      (req, res, next) ->
        where = {}
        where._id = req.params.id if req.params.id
        try
          req.db.upsert table, req.body, where
          res.end 'OK'
        catch e
          res.status(500).end 'bad update'
    deleteFn = (table) ->
      (req, res, next) ->
        return res.end 'no id' if not req.params.id
        where =
          _id: req.params.id
        if rs.config.softDelete
          req.db.update table,
            deleted:
              by: req.user._id
              at: new Date()
          , where
        else
          req.db.delete table, where
    for table in endpoints
      rs.get "/api/#{table}", rs.authenticate(), selectFn table
      rs.get "/api/#{table}/:id", rs.authenticate(), selectFn table
      rs.get "/api/#{table}/:id/all", rs.authenticate(), selectFn table, true
      rs.post "/api/#{table}/search", rs.authenticate(), selectFn table
      rs.post "/api/#{table}/search/all", rs.authenticate(), selectFn table, true
      rs.post "/api/#{table}", rs.authenticate(), upsertFn table
      rs.post "/api/#{table}/:id", rs.authenticate(), upsertFn table
      rs.put "/api/#{table}", rs.authenticate(), upsertFn table
      rs.put "/api/#{table}/:id", rs.authenticate(), upsertFn table
      rs.delete "/api/#{table}/:id", rs.authenticate(), deleteFn table
    setImmediate ->
      if rs.socket
        rs.db.on 'update', rs.socket.dbFn
        rs.db.on 'insert', rs.socket.dbFn
        rs.db.on 'delete', rs.socket.dbFn