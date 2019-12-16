(function() {
  module.exports = function(func, wait, options) {
    var args, context, later, previous, result, timeout;
    context = void 0;
    args = void 0;
    result = void 0;
    timeout = null;
    previous = 0;
    if (!options) {
      options = {};
    }
    later = function() {
      previous = options.leading === false ? 0 : Date.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) {
        context = args = null;
      }
    };
    return function() {
      var now, remaining;
      now = Date.now();
      if (!previous && options.leading === false) {
        previous = now;
      }
      remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) {
          context = args = null;
        }
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

}).call(this);

//# sourceMappingURL=throttle.js.map
