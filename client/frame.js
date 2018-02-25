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
    const caption = rest.join("\n");
    return {src, caption};
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
