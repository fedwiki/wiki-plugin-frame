(function() {
  var bind, emit, parse, expand, wiki, validateDomain;

  expand = text => {
    return wiki.resolveLinks(
      text,
      (intext) => intext
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*(.+?)\*/g, '<i>$1</i>')
    );
  };

  validateDomain = url => {
    const re = /^(?:https?:)?\/\/(([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,})(\/|$)/i;
    const matchData = url.match(re);
    const src = url;
    if (matchData) {
      const hostname = matchData[1];
      return {src, hostname};
    } else {
      const error = 'Error: frame src must include domain name';
      return {src, error};
    }
  };

  parse = text => {
    const [src, ...rest] = text.split("\n");
    var result = validateDomain(src);
    const re = /^HEIGHT (\w+)/;
    const caption = rest.filter(line => !re.test(line)).join("\n");
    let height;
    for (let line of rest) {
      var matchData = line.match(re);
      if (matchData) {
        height = matchData[1];
        break;
      }
    }
    result.caption = caption;
    result.height = height;
    return result;
  };

  emit = ($item, item) => {
    const parsed = parse(item.text);
    $item.css({
      'background-color': '#eee',
      'padding': '15px'
    });
    if (!parsed.hasOwnProperty('error')) {
      $item.append('<iframe></iframe><p></p>');
      $item.find('iframe').attr({
        width: '100%',
        style: 'border: none;',
        src: parsed.src
      });
      if (parsed.height) {
        $item.find('iframe')
          .attr('height', parsed.height);
      }
      $item.find('p').html(expand(parsed.caption));
    } else {
      $item.append(`
        <pre class="error">${parsed.error}</pre>
        <pre>${item.text}</pre>`);
    }
    return $item;
  };

  bind = function($item, item) {
    return $item.dblclick(() => {
      return wiki.textEditor($item, item);
    });
  };

  if (typeof window !== "undefined" && window !== null) {
    wiki = window.wiki;
    window.plugins.frame = {emit, bind};
  }

  if (typeof module !== "undefined" && module !== null) {
    wiki = {resolveLinks: (text, escape) => escape(text)};
    module.exports = {expand, parse};
  }

}).call(this);
