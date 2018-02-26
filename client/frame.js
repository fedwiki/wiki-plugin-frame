(function() {
  var bind, emit, parse, expand, wiki;

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

  parse = text => {
    const [src, ...rest] = text.split("\n");
    const re = /^HEIGHT (\w+)/;
    const caption = rest.filter(line => !re.test(line)).join("\n");
    let height;
    for (let line of rest) {
      matchData = line.match(re);
      if (matchData) {
        height = matchData[1];
        break;
      }
    }
    return {src, caption, height};
  };

  emit = ($item, item) => {
    const parsed = parse(item.text);
    $item.css({
      'background-color': '#eee',
      'padding': '15px'
    });
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
