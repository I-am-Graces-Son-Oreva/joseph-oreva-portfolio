const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Native autoplay/loop are browser behavior. These doubles test source-loading
// and reduced-motion decisions; the HTML check verifies the native configuration.
function fixture({ reduced = false, intersection = true } = {}) {
  class Target {
    constructor() { this.events = {}; this.classes = new Set(); }
    addEventListener(type, callback) { (this.events[type] ??= []).push(callback); }
    emit(type, event) { for (const callback of this.events[type] ?? []) callback(event); }
    classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) };
  }
  const section = new Target(); const video = new Target();
  video.paused = true; video.pauseCalls = 0; video.loadCalls = 0;
  video.dataset = { src: 'images/%22OREVA%22.MP4' };
  video.getAttribute = name => video[name] ?? null;
  video.removeAttribute = name => { delete video[name]; };
  video.load = () => video.loadCalls++;
  video.pause = () => { video.paused = true; video.pauseCalls++; };
  const motion = new Target(); motion.matches = reduced;
  let observer;
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; observer = this; }
    observe() {} disconnect() { this.disconnected = true; }
  }
  const nodes = { 'oreva-film': section, 'oreva-animation': video };
  const document = { getElementById: id => nodes[id] };
  const window = { matchMedia: () => motion };
  if (intersection) window.IntersectionObserver = IntersectionObserver;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'oreva-animation.js'), 'utf8'), { document, window });
  return { video, section, motion, visible: () => observer?.callback([{ isIntersecting: true }]) };
}

test('the movie delegates autoplay and continuous looping to native attributes without controls', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const videoTag = html.match(/<video\b[^>]*id="oreva-animation"[^>]*>/)[0];
  for (const attribute of ['autoplay', 'loop', 'muted', 'playsinline']) {
    assert.match(videoTag, new RegExp(`\\s${attribute}(?=\\s|>)`));
  }
  assert.doesNotMatch(videoTag, /\scontrols(?:\s|=|>)/);
  assert.doesNotMatch(html, /id="oreva-animation-toggle"/);
});

test('attach the movie source once when visible and leave subsequent loops to the same video', () => {
  const f = fixture(); assert.equal(f.video.src, undefined);
  f.visible(); f.visible();
  assert.equal(f.video.src, 'images/%22OREVA%22.MP4');
  assert.equal(f.video.loadCalls, 1); assert.equal(f.video.muted, true);
  f.video.emit('playing'); assert.equal(f.section.classes.has('is-playing'), true);
  f.video.emit('ended'); f.visible();
  assert.equal(f.video.loadCalls, 1); assert.equal(f.section.classes.has('is-playing'), true);
});

test('reduced motion keeps the static logo without loading video', () => {
  const f = fixture({ reduced: true }); f.visible();
  assert.equal(f.video.src, undefined); assert.equal(f.video.loadCalls, 0);
  assert.equal(f.section.classes.has('is-playing'), false);
});

test('switching motion preferences stops and unloads video, then resumes native autoplay when allowed', () => {
  const f = fixture(); f.visible(); f.video.emit('playing');
  f.motion.matches = true; f.motion.emit('change');
  assert.equal(f.video.pauseCalls, 1); assert.equal(f.video.src, undefined);
  assert.equal(f.section.classes.has('is-playing'), false);
  f.motion.matches = false; f.motion.emit('change');
  assert.equal(f.video.src, 'images/%22OREVA%22.MP4'); assert.equal(f.video.muted, true);
});

test('a video error restores the static logo', () => {
  const f = fixture(); f.visible(); f.video.emit('playing'); f.video.emit('error');
  assert.equal(f.section.classes.has('is-playing'), false);
});

test('without visibility observation, allowed video still gets its source for native autoplay', () => {
  const f = fixture({ intersection: false });
  assert.equal(f.video.src, 'images/%22OREVA%22.MP4'); assert.equal(f.video.loadCalls, 1);
});
