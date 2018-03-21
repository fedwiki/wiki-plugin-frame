// build time tests for frame plugin
// see http://mochajs.org/

(function() {
  const frame = require('../client/frame'),
        expect = require('expect.js');

  describe('frame plugin', () => {
    describe('expand', () => {
      it('can make itallic', () => {
        var result = frame.expand('hello *world*');
        expect(result).to.be('hello <i>world</i>');
      });
    });
  });

  describe('parse', () => {
    describe('SRC', () => {
      it('accepts http', () => {
        expect(frame.parse('http://example.com'))
          .to.have.property('src', 'http://example.com');
      });
      it('accepts https', () => {
        expect(frame.parse('https://example.com').src)
          .to.be('https://example.com');
      });
      it('accepts protocol-relative url', () => {
        expect(frame.parse('//example.com').src)
          .to.be('//example.com');
      });
      it('rejects missing domain', () => {
        expect(frame.parse('/some/path.html'))
          .to.have.property('error', 'Error: frame src must include domain name');
      });
    });

    var result = frame.parse(`https://example.com/something
caption to offer context to The Reader
HEIGHT 200
offer many lines to The Author`);

    it('uses first line for IFRAME SRC', () => {
      expect(result.src).to.be('https://example.com/something');
    });

    it('uses the rest of the text as a caption', () => {
      expect(result.caption).to.contain('The Reader');
      expect(result.caption).to.contain('The Author');
      expect(result.caption).not.to.contain('HEIGHT');
    });

    it('recognizes HEIGHT', () => {

      expect(result.height).to.be('200');
    });
  });

}).call(this);
