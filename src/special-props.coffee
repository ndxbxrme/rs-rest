clone = (obj) ->
  output = null
  type = Object.prototype.toString.call obj
  if type is '[object Array]'
    output = output or []
    for item in obj
      if item._id
        clonedItem = clone item
        clonedItem._id = item._id
        output.push clonedItem
  else if type is '[object Object]'
    output = output or {}
    for key of obj
      if key.indexOf('$') is 0
        output[key] = obj[key]
      else if Object.prototype.toString.call(obj[key]) is '[object Array]'
        output[key] = clone obj[key]
  output
restore = (obj, clonedProps) ->
  type = Object.prototype.toString.call obj
  if type is '[object Array]'
    for item in obj
      for clonedItem in clonedProps
        if item._id is clonedItem._id
          restore item, clonedItem
          break
  else if type is '[object Object]'
    for key of clonedProps
      if key.indexOf('$') is 0 and key isnt '$$hashKey'
        obj[key] = clonedProps[key]
        restore obj[key]
      else
        restore obj[key], clonedProps[key]
  return
module.exports = 
  clone: clone
  restore: restore