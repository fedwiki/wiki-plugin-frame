(function() {

  const resizeFudge = 30
  const defaultHeight = 150 - resizeFudge

  function expand(text) {
    return wiki.resolveLinks(
      text,
      (intext) => intext
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*(.+?)\*/g, '<i>$1</i>')
    )
  }

  function validateDomain(url) {
    const re = /^(?:https?:)?\/\/((([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}|localhost)(:[0-9]{2,})?)(\/|$)/i
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

  function parse(text) {
    const [src, ...rest] = text.split("\n")
    let result = validateDomain(src)
    let height = defaultHeight, matchData
    const caption = []
    const sources = new Set()
    for (let line of rest) {
      if (matchData = line.match(/^HEIGHT (\w+)/)) {
        height = matchData[1]
        continue
      } else if (matchData = line.match(/^SOURCE (\w+)/)) {
        sources.add(matchData[1])
      } else {
        caption.push(line)
      }
    }
    result.sandbox = 'allow-scripts'
    result.caption = caption.join("\n")
    result.height = height
    result.sources = sources
    return result
  }

  function drawFrame($item, item, parsed) {
    $item.append('<iframe></iframe><p></p>')
    const $page = $item.parents('.page')
    const identifiers = new URLSearchParams({
      pageKey: $page.data("key"),
      itemId: item.id,
      site: $page.data("site") || window.location.host,
      slug: $page.attr("id")
    }).toString()
    $item.find('iframe').attr({
      name: $page.data('key'),
      width: '100%',
      style: 'border: none;',
      src: `${parsed.src}#${identifiers}`,
      sandbox: parsed.sandbox
    })
    resize($item, parsed.height)
    $item.find('p').html(expand(parsed.caption))
  }

  function drawError($item, item, parsed) {
    return $item.append(`
        <pre class="error">${parsed.error}</pre>
        <pre>${item.text}</pre>`)
  }

  function emit($item, item) {
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

  function bind($item, item) {
    return $item.dblclick(() => {
      return wiki.textEditor($item, item)
    })
  }

  function showImporter(pages, options={}) {
    const result = wiki.newPage({title:"Import from Frame"})
    // Importer plugin expects to compute dates from journals in
    // pages. here we hack a default date to allow frame authors to
    // create pages without journals
    const date = new Date();
    for (let p of Object.values(pages)) {
      if (typeof p.journal === "undefined" || p.journal == null) {
        p.journal = [{date}]
      }
    }
    result.addParagraph(`Import of ${Object.keys(pages).length} pages.`)
    result.addItem({type: 'importer', pages})
    wiki.showResult(result, options)
  }

  function resize($item, height) {
    const el = $item.get(0)
    el.dataset.height = height+resizeFudge
    el.querySelector('iframe').setAttribute('height', height+resizeFudge)
  }

  function publishSourceData($item, name, sourceData) {
    const el = $item.get(0)
    el[`${name}Data`] = () => sourceData
    el.classList.add(`${name}-source`)
  }

  function triggerThumb($item, thumb) {
    $item.trigger("thumb", thumb)
  }

  function frameListener(event) {
    const {data} = event;
    const {action, keepLineup=false, pageKey=null, page=null, pages={}, title=null} = data;
    let options

    const $iframe = $("iframe").filter(function() {
      const $iframe = $(this)
      return $iframe.get(0).contentWindow === event.source
    })
    const $item = $iframe.parents(".item")
    let $page = null
    if (pageKey != null) {
      $page = $('.page').filter(function() {
        return $(this).data('key') === pageKey
      })
    }
    if ($page == null || $page.length == 0) {
      $page = $iframe.parents('.page')
    }

    switch (action) {
    case "sendFrameContext":
      event.source.postMessage({
        action: "frameContext",
        site: $page.data("site") || window.location.host,
        slug: $page.attr("id"),
        item: $item.data("item"),
        page: $page.data("data")
      }, "*")
      break
    case "showResult":
      options = keepLineup ? {} : {$page}
      wiki.showResult(wiki.newPage(page), options)
      break
    case "doInternalLink":
      if (keepLineup) {
        wiki.doInternalLink(title)
      } else {
        wiki.doInternalLink(title, $page)
      }
      break
    case "importer":
      options = keepLineup ? {} : {$page}
      showImporter(pages, options)
      break
    case "resize":
      let height = data.height || $item.data('height') || defaultHeight
      resize($item, height)
      break
    case "publishSourceData":
      const {name, sourceData} = data
      publishSourceData($item, name, sourceData)
      break
    case "triggerThumb":
      const {thumb} = data
      triggerThumb($item, thumb)
      break
    default:
      console.error({where:'frameListener', message: "unknown action", data})
    }
  }

  if (typeof window !== "undefined" && window !== null) {
    wiki = window.wiki
    window.plugins.frame = {emit, bind}
    if (typeof window.frameListener !== "undefined" || window.frameListener == null) {
      window.frameListener = frameListener
      window.addEventListener("message", frameListener)
    }
  }

  if (typeof module !== "undefined" && module !== null) {
    wiki = {resolveLinks: (text, escape) => escape(text)}
    module.exports = {expand, parse, publishSourceData, triggerThumb}
  }

}).call(this)
