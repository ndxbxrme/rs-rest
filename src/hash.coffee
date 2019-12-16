module.exports = (str) ->
  h = 5381
  i = str.length
  while i
    h = (h * 33) ^ str.charCodeAt --i
  h