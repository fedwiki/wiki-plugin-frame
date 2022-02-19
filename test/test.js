// build time tests for frame plugin
// see http://mochajs.org/

(function() {
  const frame = require('../client/frame'),
        expect = require('expect.js');

  describe('frame plugin', () => {
    describe('expand', () => {
      it('can make itallic', () => {
        const result = frame.expand('hello *world*');
        expect(result).to.be('hello <i>world</i>');
      });
    });
  });

  describe('parse', () => {
    describe('SRC', () => {
      it('accepts http', () => {
        const result = frame.parse('http://example.com');
        expect(result)
          .to.have.property('src', 'http://example.com');
        expect(result)
          .not.to.have.property('error');
      });
      it('accepts https', () => {
        const result = frame.parse('https://example.com');
        expect(result)
          .to.have.property('src', 'https://example.com');
        expect(result)
          .not.to.have.property('error');
      });
      it('accepts port numbers', () => {
        const result = frame.parse('https://example.com:3000');
        expect(result)
          .to.have.property('src', 'https://example.com:3000');
        expect(result)
          .not.to.have.property('error');
      });
      it('accepts protocol-relative url', () => {
        const result = frame.parse('//example.com');
        expect(result)
          .to.have.property('src', '//example.com');
        expect(result)
          .not.to.have.property('error');
      });
      it('accepts localhost', () => {
        const result = frame.parse('//localhost');
        expect(result)
          .to.have.property('src', '//localhost');
        expect(result)
          .not.to.have.property('error');
      })
      context("PLUGIN keyword", () => {
        beforeEach(() => {
          window = {document: {baseURI: "https://example.com"}}
        })
        it('is accepted', () => {
          const result = frame.parse('PLUGIN frame/integrations.html');
          expect(result)
            .to.have.property('src', 'https://example.com/plugins/frame/integrations.html');
          expect(result)
            .not.to.have.property('error');
        });
        it('encodes invalid characters in PLUGIN', () => {
          const result = frame.parse('PLUGIN frame/invalid{characters}');
          expect(result)
            .to.have.property('src', 'https://example.com/plugins/frame/invalid%7Bcharacters%7D');
          expect(result)
            .not.to.have.property('error');
        });
      })
      it('rejects missing domain', () => {
        const result = frame.parse('/some/path.html');
        expect(result)
          .to.have.property('src', '/some/path.html');
        expect(result)
          .to.have.property('error', 'Error: frame src must include domain name');
      });
    });

    describe('sandboxFor', () => {
      describe('when origin differs from frame src', () => {
        beforeEach(() => {
          window = {origin: 'http://wiki.example.com'}
        })
        it('permits allow-same-origin', () => {
          const result = frame.sandboxFor('http://frame.example.com/')
          expect(result).to.contain('allow-same-origin')
        })
      })
      describe('when origin equals frame src', () => {
        beforeEach(() => {
          window = {origin: 'http://wiki.example.com'}
        })
        it('excludes allow-same-origin', () => {
          const result = frame.sandboxFor('http://wiki.example.com/')
          expect(result).to.not.contain('allow-same-origin')
        })
      })
      describe('when frame src is protocol-relative', () => {
        beforeEach(() => {
          window = {origin: 'http://wiki.example.com'}
        })
        it('does not raise errors', () => {
          expect(frame.sandboxFor)
            .withArgs('//frame.example.com')
            .to.not.throwException()
        })
      })
    })

    describe('SOURCE', () => {
      it('is recognized', () => {
        const result = frame.parse("//example.com\nSOURCE radar")
        expect(result).to.have.property('sources');
        expect(result)
          .not.to.have.property('error');
      });
      it('accepts many sources', () => {
        const result = frame.parse("//example.com\nSOURCE radar\nSOURCE marker")
        expect(result).to.have.property('sources');
        expect(result.sources).to.be.a(Set)
        expect(result.sources.has('radar')).to.be.ok()
        expect(result.sources.has('marker')).to.be.ok()
        expect(result)
          .not.to.have.property('error');
      });
    })

    describe('triggerThumb', () => {
      let $item, actual = []
      beforeEach(() => {
        $item = {trigger: (...args) => actual = Array.from(args)}
      })
      it('follows the existing jQuery event protocol', () => {
        frame.triggerThumb($item, "Some Column Heading")
        expect(actual[0]).to.be("thumb")
        expect(actual[1]).to.be("Some Column Heading")
      })
    })

    describe('LINEUP', () => {
      it('is recognized', () => {
        const result = frame.parse("//example.com\nLINEUP point")
        expect(result).to.have.property('lineups');
        expect(result)
          .not.to.have.property('error');
      });
      it('accepts many lineups', () => {
        const result = frame.parse("//example.com\nLINEUP point\nLINEUP turtle")
        expect(result).to.have.property('lineups');
        expect(result.lineups).to.be.a(Set)
        expect(result.lineups.has('point')).to.be.ok()
        expect(result.lineups.has('turtle')).to.be.ok()
        expect(result)
          .not.to.have.property('error');
      });
    })

    const result = frame.parse(`https://example.com/something
caption to offer context to The Reader
HEIGHT 200
offer many lines to The Author
SOURCE radar
LINEUP point`);

    it('uses first line for IFRAME SRC', () => {
      expect(result.src).to.be('https://example.com/something');
    });

    it('uses the rest of the text as a caption', () => {
      expect(result.caption).to.contain('The Reader');
      expect(result.caption).to.contain('The Author');
      expect(result.caption).not.to.contain('HEIGHT');
      expect(result.caption).not.to.contain('SOURCE');
    });

    it('recognizes HEIGHT', () => {
      expect(result.height).to.be(200);
    });
  });
}).call(this);
