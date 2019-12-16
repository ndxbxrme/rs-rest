(function() {
  module.exports = function(str) {
    var h, i;
    h = 5381;
    i = str.length;
    while (i) {
      h = (h * 33) ^ str.charCodeAt(--i);
    }
    return h;
  };

}).call(this);

//# sourceMappingURL=hash.js.map
