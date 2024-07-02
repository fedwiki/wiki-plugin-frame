(function() {
  const frame = require('../client/frame'),
        expect = require('expect.js');

  describe('events', () => {

    describe('triggerThumb', () => {
      let $item, actual = [];
      beforeEach(() => {
        $item = {trigger: (...args) => actual = Array.from(args)};
      });
      it('follows the existing jQuery event protocol', () => {
        frame.triggerThumb($item, "Some Column Heading");
        expect(actual[0]).to.be("thumb");
        expect(actual[1]).to.be("Some Column Heading");
      });
    });

    describe('publishSourceData', () => {
      context('with mock browser context for origin, location, and DOM', () => {
        // The amount of setup needed for this context is a big code smell.
        // We are mocking jQuery and DOM objects which are pretty tangled.
        // We'll hold our nose for now.
        // Also, the nature of the code under test works through side effects.
        // Some amount of mess in the test is to be expected.
        let $item, div, actualEvent;
        const MOCK_PAGE_KEY = 'b78fab';
        const MOCK_ITEM_ID = 'a56fab';
        const MOCK_TITLE = 'Some Page Title';
        const MOCK_SLUG = 'some-page-title';
        const MOCK_ORIGIN = 'https://example.com';
        const MOCK_HOST = (new URL(MOCK_ORIGIN)).host;
        beforeEach(() => {
          window = {
            origin: MOCK_ORIGIN,
            location: {host: MOCK_HOST},
          }
          div = {
            classList: new Set(),
            dispatchEvent(event) {actualEvent = event;}
          };
          $item = {
            get(n) {return div;},
            data(which='ALL') { /* $item */
              switch(which) {
              case 'ALL': return {id: MOCK_ITEM_ID};
              default: return new Error(`$item.data() unexpected key: ${which}`);
              }
            },
            parents(_) {
              if (_ != '.page') {
                throw new Error(`parents() was expecting '.page' instead of '${_}'`);
              }
              return {
              data(which) { /* mocking $page */
                switch(which) {
                case 'key': return MOCK_PAGE_KEY;
                case 'data': return {title: MOCK_TITLE};
                case 'site': return undefined;
                default: return new Error('unexpected key for data()');
                }
              },
              attr(which) {
                switch(which) {
                case 'id': return MOCK_SLUG;
                default: return new Error('unexpected key for attr()');
                }
              }
            };}
          };

          frame.publishSourceData($item, 'foo', {FOO:'BAR'});
        });
        it('includes identifiers from the browser context', () => {
          expect(actualEvent).to.have.property('detail');
          expect(actualEvent.detail).to.have.property('pageKey', MOCK_PAGE_KEY);
          expect(actualEvent.detail).to.have.property('itemId', MOCK_ITEM_ID);
          expect(actualEvent.detail).to.have.property('origin', MOCK_ORIGIN);
          expect(actualEvent.detail).to.have.property('site', MOCK_HOST);
          expect(actualEvent.detail).to.have.property('slug', MOCK_SLUG);
          expect(actualEvent.detail).to.have.property('title', MOCK_TITLE);
        });
        it('adds a topic-source class to the div', () => {
          expect(div.classList.has('foo-source')).to.equal(true);
        });
        it('adds an accessor to the div', () => {
          expect(div).to.have.property('fooData');
          const data = div.fooData();
          expect(data).to.have.property('FOO');
          expect(data.FOO).to.be('BAR');
        });
        it('uses a custom event type for the given topic', () => {
          expect(actualEvent).to.have.property('type', 'fooStream');
        });
        it('configures the custom event to bubble', () => {
          expect(actualEvent).to.have.property('bubbles', true);
        });
        it('includes the data in the custom event', () => {
          expect(actualEvent).to.have.property('detail');
          expect(actualEvent.detail).to.have.property('FOO');
          expect(actualEvent.detail.FOO).to.be('BAR');
        });
      });
    });

  });

}).call(this)
