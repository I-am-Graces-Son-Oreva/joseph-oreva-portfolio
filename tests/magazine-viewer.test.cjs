const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// No browser is connected. These DOM doubles exercise our event/controller code;
// native dialog focus trapping and touch layout still require browser review.
function fixture(supported = true) {
  class Element {
    constructor() {
      this.events = {}; this.attributes = {}; this.classes = new Set();
      this.classList = {
        add: name => this.classes.add(name),
        remove: name => this.classes.delete(name),
        toggle: name => {
          if (this.classes.has(name)) { this.classes.delete(name); return false; }
          this.classes.add(name); return true;
        }
      };
    }
    addEventListener(type, handler) { (this.events[type] ??= []).push(handler); }
    emit(type, event = {}) { for (const handler of this.events[type] ?? []) handler(event); }
    setAttribute(name, value) { this.attributes[name] = value; }
    focus() { document.activeElement = this; }
    scrollTo() { this.scrolledToOrigin = true; }
  }
  const ids = Object.fromEntries(['press', 'magazine-viewer', 'magazine-viewer-image',
    'magazine-viewer-close', 'magazine-viewer-zoom', 'magazine-viewer-stage',
    'magazine-viewer-caption', 'magazine-viewer-previous', 'magazine-viewer-next',
    'magazine-viewer-position'].map(id => [id, new Element()]));
  const document = { getElementById: id => ids[id], body: new Element() };
  const dialog = ids['magazine-viewer'];
  dialog.showModal = supported ? function () { this.open = true; } : undefined;
  dialog.close = function () { this.open = false; this.emit('close'); };
  const links = [
    ['images/pivot_cover_cropped.jpg', 'The Pivot cover'],
    ['images/pivot_full_spread_cropped.jpg', 'The complete two-page spread'],
    ['images/pivot_page_40_cropped.jpg', 'Page 40'],
    ['images/pivot_page_41.jpg', 'Page 41']
  ].map(([src, alt]) => {
    const image = { alt, src };
    const figure = { querySelector: selector => selector === 'img' ? image : { textContent: alt } };
    const item = new Element(); item.href = src;
    item.closest = selector => selector === 'figure' ? figure : item;
    return item;
  });
  // The spread caption has a second link to the same photograph.
  const duplicate = new Element(); duplicate.href = links[1].href;
  duplicate.closest = links[1].closest;
  ids.press.querySelectorAll = () => [...links, duplicate];
  const link = links[0];
  document.activeElement = link;
  const script = path.join(__dirname, '..', 'magazine-viewer.js');
  vm.runInNewContext(fs.existsSync(script) ? fs.readFileSync(script, 'utf8') : '', { document });
  function activate(modifiers = {}) {
    const event = { target: link, button: 0, prevented: false,
      preventDefault() { this.prevented = true; }, ...modifiers };
    ids.press.emit('click', event); return event;
  }
  return { ids, document, dialog, link, links, activate };
}

test('activating a magazine image opens its larger image with its accessible description', () => {
  const f = fixture(); const event = f.activate();
  assert.equal(f.dialog.open, true);
  assert.equal(event.prevented, true);
  assert.equal(f.ids['magazine-viewer-image'].src, 'images/pivot_cover_cropped.jpg');
  assert.equal(f.ids['magazine-viewer-image'].alt, 'The Pivot cover');
  assert.equal(f.document.activeElement, f.ids['magazine-viewer-close']);
  assert.equal(f.document.body.classes.has('magazine-viewer-open'), true);
});

test('Close releases scroll lock and restores focus to the activating link', () => {
  const f = fixture(); f.activate(); f.ids['magazine-viewer-close'].emit('click');
  assert.equal(f.dialog.open, false);
  assert.equal(f.document.activeElement, f.link);
  assert.equal(f.document.body.classes.has('magazine-viewer-open'), false);
});

test('Escape cancel and backdrop actions close the viewer', () => {
  const f = fixture(); f.activate();
  f.dialog.emit('cancel', { preventDefault() {} });
  assert.equal(f.dialog.open, false); assert.equal(f.document.activeElement, f.link);
  f.activate(); f.dialog.emit('click', { target: f.dialog });
  assert.equal(f.dialog.open, false);
});

test('zoom toggles its accessible state and resets before the next image', () => {
  const f = fixture(); f.activate(); f.ids['magazine-viewer-zoom'].emit('click');
  assert.equal(f.ids['magazine-viewer-stage'].classes.has('is-zoomed'), true);
  assert.equal(f.ids['magazine-viewer-zoom'].attributes['aria-pressed'], 'true');
  f.ids['magazine-viewer-close'].emit('click'); f.activate();
  assert.equal(f.ids['magazine-viewer-stage'].classes.has('is-zoomed'), false);
  assert.equal(f.ids['magazine-viewer-zoom'].attributes['aria-pressed'], 'false');
});

test('modified clicks and browsers without native dialogs retain the direct image link', () => {
  const normal = fixture(); assert.equal(normal.activate({ ctrlKey: true }).prevented, false);
  assert.equal(normal.dialog.open, undefined);
  const fallback = fixture(false); assert.equal(fallback.activate().prevented, false);
});


test('next and previous show distinct photographs, wrap at either end, and keep the opener for focus restoration', () => {
  const f = fixture(); f.activate();
  f.ids['magazine-viewer-next'].emit('click');
  assert.equal(f.ids['magazine-viewer-image'].src, 'images/pivot_full_spread_cropped.jpg');
  assert.equal(f.ids['magazine-viewer-image'].alt, 'The complete two-page spread');
  assert.equal(f.ids['magazine-viewer-position'].textContent, '2 of 4');
  f.ids['magazine-viewer-previous'].emit('click');
  assert.equal(f.ids['magazine-viewer-image'].src, 'images/pivot_cover_cropped.jpg');
  f.ids['magazine-viewer-previous'].emit('click');
  assert.equal(f.ids['magazine-viewer-image'].src, 'images/pivot_page_41.jpg');
  assert.equal(f.ids['magazine-viewer-position'].textContent, '4 of 4');
  f.ids['magazine-viewer-next'].emit('click');
  assert.equal(f.ids['magazine-viewer-image'].src, 'images/pivot_cover_cropped.jpg');
  f.ids['magazine-viewer-close'].emit('click');
  assert.equal(f.document.activeElement, f.link);
});

test('left and right keys navigate and reset zoom without hijacking modified shortcuts', () => {
  const f = fixture(); f.activate(); f.ids['magazine-viewer-zoom'].emit('click');
  let prevented = false;
  f.dialog.emit('keydown', { key: 'ArrowRight', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(f.ids['magazine-viewer-image'].src, 'images/pivot_full_spread_cropped.jpg');
  assert.equal(f.ids['magazine-viewer-zoom'].attributes['aria-pressed'], 'false');
  f.dialog.emit('keydown', { key: 'ArrowLeft', preventDefault() {} });
  assert.equal(f.ids['magazine-viewer-image'].src, 'images/pivot_cover_cropped.jpg');
  f.dialog.emit('keydown', { key: 'ArrowRight', ctrlKey: true, preventDefault() { assert.fail('shortcut intercepted'); } });
  assert.equal(f.ids['magazine-viewer-image'].src, 'images/pivot_cover_cropped.jpg');
});

test('clicking the image does not close it; clicking the empty image surround does', () => {
  const f = fixture(); f.activate();
  f.dialog.emit('click', { target: f.ids['magazine-viewer-image'] });
  assert.equal(f.dialog.open, true);
  f.dialog.emit('click', { target: f.ids['magazine-viewer-stage'] });
  assert.equal(f.dialog.open, false);
});

test('opening the featured spread starts at that image and moves directly to page 40', () => {
  const f = fixture(); f.activate({ target: f.links[1] });
  assert.equal(f.ids['magazine-viewer-image'].src, 'images/pivot_full_spread_cropped.jpg');
  assert.equal(f.ids['magazine-viewer-position'].textContent, '2 of 4');
  f.ids['magazine-viewer-next'].emit('click');
  assert.equal(f.ids['magazine-viewer-image'].src, 'images/pivot_page_40_cropped.jpg');
  f.ids['magazine-viewer-close'].emit('click');
  assert.equal(f.document.activeElement, f.links[1]);
});
