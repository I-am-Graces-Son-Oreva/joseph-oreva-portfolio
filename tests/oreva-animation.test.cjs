const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Native autoplay/loop are browser behavior. These doubles test source-loading
// and reduced-motion decisions; the HTML check verifies the native configuration.
function fixture({ reduced = false, intersection = true, rejectPlay = false, pendingPlay = false } = {}) {
  class Target {
    constructor() { this.events = {}; this.classes = new Set(); }
    addEventListener(type, callback) { (this.events[type] ??= []).push(callback); }
    emit(type, event) { for (const callback of this.events[type] ?? []) callback(event); }
    classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) };
  }
  const section = new Target(); const video = new Target();
  video.paused = true; video.pauseCalls = 0; video.loadCalls = 0; video.playCalls = 0;
  let source;
  Object.defineProperty(video, 'src', {
    get: () => source,
    set(value) {
      source = value;
      video.configurationAtSource = {
        autoplay: video.autoplay, muted: video.muted, defaultMuted: video.defaultMuted,
        loop: video.loop, playsInline: video.playsInline, controls: video.controls
      };
    }, configurable: true
  });
  video.play = () => {
    video.playCalls++;
    if (pendingPlay) return new Promise((resolve, reject) => (video.pendingRejections ??= []).push(reject));
    if (rejectPlay) return Promise.reject(new Error('Autoplay denied'));
    video.paused = false; video.emit('playing'); return Promise.resolve();
  };
  video.dataset = { src: 'images/%22OREVA%22.MP4' };
  video.getAttribute = name => video[name] ?? null;
  video.removeAttribute = name => { if (name === 'src') source = undefined; else delete video[name]; };
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


test('configure muted inline looping properties before attaching the movie source', () => {
  const f = fixture(); f.visible();
  assert.deepEqual(f.video.configurationAtSource, {
    autoplay: true, muted: true, defaultMuted: true, loop: true, playsInline: true, controls: false
  });
  assert.equal(f.video.playCalls, 1);
  assert.equal(f.section.classes.has('is-playing'), true);
});

test('attempt playback once and keep the logo fallback after rejection without repeated retries', async () => {
  const f = fixture({ rejectPlay: true }); f.visible(); await Promise.resolve();
  assert.equal(f.video.playCalls, 1);
  assert.equal(f.section.classes.has('is-playing'), false);
  for (let i = 0; i < 5; i++) { f.visible(); f.video.emit('canplay'); f.video.emit('canplaythrough'); }
  await Promise.resolve();
  assert.equal(f.video.playCalls, 1); assert.equal(f.video.loadCalls, 1);
});

test('reduced motion never requests playback and stopping media does not introduce a restart loop', () => {
  const f = fixture({ reduced: true }); f.visible(); assert.equal(f.video.playCalls, 0);
  f.motion.matches = false; f.motion.emit('change'); assert.equal(f.video.playCalls, 1);
  f.motion.matches = true; f.motion.emit('change'); assert.equal(f.video.playCalls, 1);
});

test('video remains CSS-visible before playback while the static logo overlays it', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  // Startup must not depend on playing to make the video eligible for Safari autoplay.
  assert.match(css, /\.brand-film-stage video\{visibility:visible\}/);
  const fallback = css.match(/(?:^|\n)\.brand-film-fallback\{[^}]*\}/)[0];
  assert.match(fallback, /z-index:1/);
});


test('a stale rejected play request cannot hide a newer successful playback', async () => {
  const f = fixture({ pendingPlay: true }); f.visible();
  f.motion.matches = true; f.motion.emit('change');
  f.motion.matches = false; f.motion.emit('change');
  f.video.emit('playing');
  f.video.pendingRejections[0](new Error('Old source was unloaded'));
  await Promise.resolve();
  assert.equal(f.section.classes.has('is-playing'), true);
  assert.equal(f.video.playCalls, 2);
});
