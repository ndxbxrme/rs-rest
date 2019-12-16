(function() {
  module.exports = function(config) {
    return function(rs) {
      var deleteFn, endpoints, i, len, selectFn, table, upsertFn;
      endpoints = rs.config.tables;
      rs.get('/rest/endpoints', function(req, res) {
        return res.json(endpoints);
      });
      if (rs.socket && rs.db) {
        rs.db.on('update', rs.socket.dbFn);
        rs.db.on('insert', rs.socket.dbFn);
        rs.db.on('delete', rs.socket.dbFn);
      }
      selectFn = function(table, all) {
        return async function(req, res, next) {
          var ref, ref1, result, where;
          where = req.body.where || req.body || {};
          if ((ref = req.params) != null ? ref.id : void 0) {
            if (/^\{/.test(req.params.id)) {
              where = JSON.parse(req.params.id);
            } else {
              where._id = req.params.id;
            }
          }
          if (rs.config.softDelete && !req.body.showDeleted && typeof where.deleted === 'undefined') {
            where.deleted = null;
          }
          if (req.body.all || all) {
            req.user.role = null;
          }
          if ((ref1 = req.params) != null ? ref1.id : void 0) {
            return res.json((await req.db.selectOne(table, where)));
          } else {
            result = (await req.db.select(table, where));
            return res.json({
              items: result,
              total: result.total,
              page: result.page,
              pageSize: result.pageSize
            });
          }
        };
      };
      upsertFn = function(table) {
        return function(req, res, next) {
          var e, where;
          where = {};
          if (req.params.id) {
            where._id = req.params.id;
          }
          try {
            req.db.upsert(table, req.body, where);
            return res.end('OK');
          } catch (error) {
            e = error;
            return res.status(500).end('bad update');
          }
        };
      };
      deleteFn = function(table) {
        return function(req, res, next) {
          var where;
          if (!req.params.id) {
            return res.end('no id');
          }
          where = {
            _id: req.params.id
          };
          if (rs.config.softDelete) {
            return req.db.update(table, {
              deleted: {
                by: req.user._id,
                at: new Date()
              }
            }, where);
          } else {
            return req.db.delete(table, where);
          }
        };
      };
      for (i = 0, len = endpoints.length; i < len; i++) {
        table = endpoints[i];
        rs.get(`/api/${table}`, rs.authenticate(), selectFn(table));
        rs.get(`/api/${table}/:id`, rs.authenticate(), selectFn(table));
        rs.get(`/api/${table}/:id/all`, rs.authenticate(), selectFn(table, true));
        rs.post(`/api/${table}/search`, rs.authenticate(), selectFn(table));
        rs.post(`/api/${table}/search/all`, rs.authenticate(), selectFn(table, true));
        rs.post(`/api/${table}`, rs.authenticate(), upsertFn(table));
        rs.post(`/api/${table}/:id`, rs.authenticate(), upsertFn(table));
        rs.put(`/api/${table}`, rs.authenticate(), upsertFn(table));
        rs.put(`/api/${table}/:id`, rs.authenticate(), upsertFn(table));
        rs.delete(`/api/${table}/:id`, rs.authenticate(), deleteFn(table));
      }
      return setImmediate(function() {
        if (rs.socket) {
          rs.db.on('update', rs.socket.dbFn);
          rs.db.on('insert', rs.socket.dbFn);
          return rs.db.on('delete', rs.socket.dbFn);
        }
      });
    };
  };

}).call(this);

//# sourceMappingURL=server.js.map
