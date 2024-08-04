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

  function validateSrc(line) {
    const re = /^(https?:)?\/\/((([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}|localhost)(:[0-9]{2,})?)(\/|$)/i
    let matchData, src = line
    if (matchData = line.match(re)) {
      const hostname = matchData[1]
      return {src, hostname}
    } else if (matchData = line.match(/^PLUGIN (.+)$/)) {
      try {
        src = new URL(`/plugins/${matchData[1]}`, window.document.baseURI).toString()
        return {src}
      } catch (error) {
        if (! error instanceof TypeError) {
          throw(error)
        }
        return {src, error}
      }
    } else {
      const error = 'Error: frame src must include domain name'
      return {src, error}
    }
  }

  function parse(text) {
    const [line, ...rest] = text.split("\n")
    const src = validateSrc(line)
    let height = defaultHeight, matchData
    const caption = []
    const sources = new Set()
    const lineups = new Set()
    for (const line of rest) {
      if (matchData = line.match(/^HEIGHT (\w+)/)) {
        height = +matchData[1]
        continue
      } else if (matchData = line.match(/^SOURCE (\w+)/)) {
        sources.add(matchData[1])
      } else if (matchData = line.match(/^LINEUP (\w+)/)) {
        lineups.add(matchData[1])
      } else {
        caption.push(line)
      }
    }
    return {
      ...src,
      caption: caption.join("\n"),
      height,
      sources,
      lineups
    }
  }

  function identifiers($item, item) {
    const $page = $item.parents('.page')
    return {
      pageKey: $page.data("key"),
      itemId: item.id,
      origin: window.origin,
      site: $page.data("site") || window.location.host,
      slug: $page.attr("id"),
      title: $page.data("data").title
    }
  }

  function sandboxFor(url) {
    if (url.startsWith('//')) {
      const {protocol} = new URL(window.origin)
      url = `${protocol}${url}`
    }
    return (window.origin == new URL(url).origin)
          ? 'allow-scripts allow-downloads allow-forms'
          : 'allow-scripts allow-downloads allow-forms allow-same-origin'
  }

  function drawFrame($item, item, parsed) {
    const params = new URLSearchParams(identifiers($item, item)).toString()
    const frame = document.createElement('iframe')
    const sandbox = sandboxFor(parsed.src)
    for (const [attr, value] of [
      ['sandbox', sandbox],
      ['width', '100%'],
      ['style', 'border: none;'],
      ['src', `${parsed.src}#${params}`]
    ]) {
      frame.setAttribute(attr, value)
    }
    $item.append(frame)
    $item.append($('<p>').html(expand(parsed.caption)))
    resize($item, parsed.height)
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
    const parsed = parse(item.text)
    const div = $item.get(0)
    const lineup = div.closest('.main')
    const iframe = div.querySelector('iframe')
    const _ids = identifiers($item, item)
    for (const topic of parsed.lineups) {
      addLineupListener(lineup, iframe, topic)
    }
    for (const topic of parsed.sources) {
      addSource(div, topic)
    }
    return $item.on('dblclick', () => {
      return wiki.textEditor($item, item)
    })
  }

  function addLineupListener(lineup, iframe, topic) {
    // TODO: there's a memory leak here. Need to prevent adding
    // duplicate listeners to the DOM. Probably implies keeping an
    // inventory of listeners we've added to the DOM and probably also
    // need a garbage collector.
    lineup.addEventListener(`${topic}Stream`, ({detail}) =>
      iframe.contentWindow.postMessage({
        ...detail,
        action: `${topic}Stream`
      }, "*")
    )
  }

  function requestSourceData($item, topic) {
    const sources = []
    for (const div of document.querySelectorAll(`.item`)) {
      if (div.classList.contains(`${topic}-source`)) {
        sources.unshift(div)
      }
      if (div === $item.get(0)) {
        break
      }
    }
    // Ugh. A problem described in 4 parts:
    // 1 of 4. Looks like I was intending to return an object.
    let sourceData = {}
    if (sources.length > 0) {
      // 2 of 4. But .map() returns an Array. This broke my own "contract"  :-(
      // 3 of 4. many existing scripts in the wild expect this Array
      sourceData = sources.map(div => {
        const $div = $(div)
        const result = {
          panel: identifiers($div, $div.data())
        }
        result[`${topic}Data`] = div[`${topic}Data`]()
        return result
      })
    } else {
      // 4 of 4. The error case returns an Object--showing the original intent
      sourceData = {
        error: `cannot find a source for "${topic}" in the lineup`,
        ...identifiers($item, $item.data())
      }
    }
    return sourceData
  }

  function publishSourceData($item, topic, sourceData) {
    const div = $item.get(0)
    div[`${topic}Data`] = () => sourceData
    addSource(div, topic)
    const topicEvent = new CustomEvent(`${topic}Stream`, {
      bubbles: true,
      detail: {
        ...identifiers($item, $item.data()),
        ...sourceData
      }
    })
    div.dispatchEvent(topicEvent)
  }

  function addSource(div, topic) {
    div.classList.add(`${topic}-source`)
  }

  function triggerThumb($item, thumb) {
    $item.trigger("thumb", thumb)
  }

  function showImporter(pages, options={}) {
    const result = wiki.newPage({title:"Import from Frame"})
    // Importer plugin expects to compute dates from journals in
    // pages. here we hack a default date to allow frame authors to
    // create pages without journals
    const date = new Date();
    for (const p of Object.values(pages)) {
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

  function frameListener(event) {
    // is this message for us?
    // events from iframes don't have an opener
    // ensure that the iframe is one of ours
    if (event.source.opener) {
      if (wiki.debug) {console.log('frameListener - not for us', {event})}
      return
    }
    const $iframe = $(".item.frame iframe")
          .filter((_i,el) => el.contentWindow === event.source);
    if ($iframe.length <= 0) {
      if (wiki.debug) {console.log('frameListener - not for us', {event})}
      return
    }
    if (wiki.debug) {console.log('frameListener - ours', {event})}

    const {data} = event;
    const {action, keepLineup=false, pageKey=null, page=null, pages={},
           title=null, site=null} = data;
    let options

    const $item = $iframe.parents(".item")
    let $page = null
    if (pageKey != null) {
      $page = $('.page').filter((_i, el) => $(el).data('key') == pageKey)
    }
    if ($page == null || $page.length == 0) {
      $page = $iframe.parents('.page')
    }

    switch (action) {
    case "sendFrameContext":
      event.source.postMessage({
        action: "frameContext",
        ...identifiers($item, $item.data()),
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
        wiki.doInternalLink(title, null, site)
      } else {
        wiki.doInternalLink(title, $page, site)
      }
      break
    case "importer":
      options = keepLineup ? {} : {$page}
      showImporter(pages, options)
      break
    case "resize":
      {
      const height = data.height || +$item.data('height') || defaultHeight
      resize($item, height)
      break
      }
    case "triggerThumb":
      {
      const {thumb} = data
      triggerThumb($item, thumb)
      break
      }
    case "publishSourceData":
      {
      let {name, topic, sourceData} = data
      if (!!name && !topic) {
        const [url='unknown URL'] = $item.data()?.item?.text?.split(/\n/)
        console.warn(`a frame at ${url} sent a "publishSourceData" action with a "name".
That action now expects a "topic" instead of "name" (changed in version 0.10.2).
We recommend sending the following message: `, {
  action,
  topic: name,
  sourceData: '...' // elided to improve signal-to-noise ratio of our warning
})
        topic = name
      }
      publishSourceData($item, topic, sourceData)
      break
      }
    case "requestSourceData":
      {
      const sources = requestSourceData($item, topic)
      event.source.postMessage({
        action: "sourceData",
        topic,
        sources
      }, "*")
      break
      }
    case "requestNeighborhood":
      event.source.postMessage({
        action: "neighborhood",
        neighborhood: Object.keys(wiki.neighborhood)
          .filter(key => wiki.neighborhood[key].hasOwnProperty("sitemap"))
      }, "*")
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
    module.exports = {
      expand, parse, sandboxFor,
      triggerThumb, publishSourceData
    }
  }

}).call(this)
