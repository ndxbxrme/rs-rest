module.exports = (func, wait, options) ->
  context = undefined
  args = undefined
  result = undefined
  timeout = null
  previous = 0
  if !options
    options = {}
  later = ->
    previous = if options.leading == false then 0 else Date.now()
    timeout = null
    result = func.apply(context, args)
    if !timeout
      context = args = null
    return
  ->
    now = Date.now()
    if !previous and options.leading == false
      previous = now
    remaining = wait - (now - previous)
    context = this
    args = arguments
    if remaining <= 0 or remaining > wait
      if timeout
        clearTimeout timeout
        timeout = null
      previous = now
      result = func.apply(context, args)
      if !timeout
        context = args = null
    else if !timeout and options.trailing != false
      timeout = setTimeout later, remaining
    result