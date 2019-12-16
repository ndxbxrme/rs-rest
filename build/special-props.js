(function() {
  var clone, restore;

  clone = function(obj) {
    var clonedItem, i, item, key, len, output, type;
    output = null;
    type = Object.prototype.toString.call(obj);
    if (type === '[object Array]') {
      output = output || [];
      for (i = 0, len = obj.length; i < len; i++) {
        item = obj[i];
        if (item._id) {
          clonedItem = clone(item);
          clonedItem._id = item._id;
          output.push(clonedItem);
        }
      }
    } else if (type === '[object Object]') {
      output = output || {};
      for (key in obj) {
        if (key.indexOf('$') === 0) {
          output[key] = obj[key];
        } else if (Object.prototype.toString.call(obj[key]) === '[object Array]') {
          output[key] = clone(obj[key]);
        }
      }
    }
    return output;
  };

  restore = function(obj, clonedProps) {
    var clonedItem, i, item, j, key, len, len1, type;
    type = Object.prototype.toString.call(obj);
    if (type === '[object Array]') {
      for (i = 0, len = obj.length; i < len; i++) {
        item = obj[i];
        for (j = 0, len1 = clonedProps.length; j < len1; j++) {
          clonedItem = clonedProps[j];
          if (item._id === clonedItem._id) {
            restore(item, clonedItem);
            break;
          }
        }
      }
    } else if (type === '[object Object]') {
      for (key in clonedProps) {
        if (key.indexOf('$') === 0 && key !== '$$hashKey') {
          obj[key] = clonedProps[key];
          restore(obj[key]);
        } else {
          restore(obj[key], clonedProps[key]);
        }
      }
    }
  };

  module.exports = {
    clone: clone,
    restore: restore
  };

}).call(this);

//# sourceMappingURL=special-props.js.map
