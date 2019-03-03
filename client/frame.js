(function() {
  var bind, emit, parse, expand, wiki, location,
      validateDomain, drawFrame, drawError

  expand = text => {
    return wiki.resolveLinks(
      text,
      (intext) => intext
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*(.+?)\*/g, '<i>$1</i>')
    )
  }

  validateDomain = url => {
    const re = /^(?:https?:)?\/\/(([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}(:[0-9]{2,})?)(\/|$)/i
    const matchData = url.match(re)
    const src = url
    if (matchData) {
      const hostname = matchData[1]
      return {src, hostname}
    } else {
      const error = 'Error: frame src must include domain name'
      return {src, error}
    }
  }

  parse = text => {
    const [src, ...rest] = text.split("\n")
    var result = validateDomain(src)
    const re = /^HEIGHT (\w+)/
    const caption = rest.filter(line => !re.test(line)).join("\n")
    let height
    for (let line of rest) {
      var matchData = line.match(re)
      if (matchData) {
        height = matchData[1]
        break
      }
    }
    result.sandbox = 'allow-scripts'
    result.caption = caption
    result.height = height
    return result
  }

  drawFrame = ($item, item, parsed) => {
    $item.append('<iframe></iframe><p></p>')
    $item.find('iframe').attr({
      width: '100%',
      style: 'border: none;',
      src: parsed.src,
      sandbox: parsed.sandbox
    })
    if (parsed.height) {
      $item.find('iframe')
        .attr('height', parsed.height)
    }
    $item.find('p').html(expand(parsed.caption))
  }

  drawError = ($item, item, parsed) => {
    $item.append(`
        <pre class="error">${parsed.error}</pre>
        <pre>${item.text}</pre>`)
  }

  emit = ($item, item) => {
    const parsed = parse(item.text)
    $item.css({
      'background-color': '#eee',
      'padding': '15px'
    })
    if (!parsed.hasOwnProperty('error')) {
      drawFrame($item, item, parsed)
    } else { // display error
      drawError($item, item, parsed)
    }
    return $item
  }

  bind = function($item, item) {
    return $item.dblclick(() => {
      return wiki.textEditor($item, item)
    })
  }

  if (typeof window !== "undefined" && window !== null) {
    wiki = window.wiki
    location = window.location
    window.plugins.frame = {emit, bind}
  }

  if (typeof module !== "undefined" && module !== null) {
    wiki = {resolveLinks: (text, escape) => escape(text)}
    location = {hostname: 'example.com'}
    module.exports = {expand, parse}
  }

}).call(this)
