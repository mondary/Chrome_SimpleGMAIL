import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../../src/extension-pk/themes/studio/no-left-menu.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../src/extension-pk/tweaks/no-left-menu.css', import.meta.url), 'utf8');
const generated = readFileSync(new URL('../../src/extension-pk/data/manifest.js', import.meta.url), 'utf8');
const extensionManifest = JSON.parse(readFileSync(new URL('../../src/extension-pk/manifest.json', import.meta.url), 'utf8'));

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    this.textContent = '';
    this.style = { setProperty: (name, value) => { this.style[name] = value; } };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(...children) { this.children.push(...children); }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  click() { this.listeners.click?.(); }
}

function harness(lang = 'fr', delayedBurger = false) {
  const burger = { getBoundingClientRect: () => ({ left: 16, width: 40, height: 40, bottom: 52 }) };
  let headerReady = !delayedBurger;
  let observer;
  const events = {};
  class MutationObserver {
    constructor(callback) { this.callback = callback; observer = this; }
    observe() { this.observing = true; }
    disconnect() { this.observing = false; }
  }
  const body = new Element('body');
  const document = {
    documentElement: { lang },
    body,
    createElement: (tag) => new Element(tag),
    querySelector: (selector) => {
      assert.ok(selector.startsWith('#gb '), 'must not depend on Gmail hidden folder nodes');
      return headerReady ? burger : null;
    },
    getElementById: (id) => body.children.find((child) => child.id === id) || null,
  };
  const context = vm.createContext({ document, navigator: { language: lang }, MutationObserver,
    window: { addEventListener: (type, handler) => { events[type] = handler; } } });
  vm.runInContext(script, context);
  return { body, burger, context, events, get observer() { return observer; },
    mountHeader: () => { headerReady = true; observer.callback(); } };
}

test('six real Gmail folder links work without any hidden native menu nodes', () => {
  const h = harness();
  const [rail] = h.body.children;
  assert.equal(rail.id, 'pk-no-left-menu-rail');
  assert.equal(rail.getAttribute('aria-label'), 'Dossiers Gmail');
  assert.deepEqual(rail.children.map((button) => button.getAttribute('aria-label')),
    ['Boîte de réception', 'Messages suivis', 'Messages envoyés', 'Brouillons', 'Spam', 'Corbeille']);
  assert.ok(rail.children.every((button) => button.innerHTML.includes('<svg')));

  assert.deepEqual(rail.children.map((link) => link.tagName), Array(6).fill('a'));
  assert.deepEqual(rail.children.map((link) => link.getAttribute('href')),
    ['#inbox', '#starred', '#sent', '#drafts', '#spam', '#trash']);
  for (const account of [0, 3]) {
    const base = `https://mail.google.com/mail/u/${account}/#inbox/thread`;
    for (const link of rail.children) {
      const destination = new URL(link.getAttribute('href'), base);
      assert.equal(destination.pathname, `/mail/u/${account}/`);
      assert.equal(link.listeners.click, undefined, 'native anchor activation must not be intercepted');
    }
  }
});

test('NoLeftMenu uses English labels and does not create a second rail', () => {
  const h = harness('en');
  vm.runInContext(script, h.context);
  assert.equal(h.body.children.length, 1);
  assert.equal(h.body.children[0].getAttribute('aria-label'), 'Gmail folders');
  assert.deepEqual(h.body.children[0].children.map((button) => button.getAttribute('aria-label')),
    ['Inbox', 'Starred', 'Sent', 'Drafts', 'Spam', 'Trash']);
});

test('icons align below the burger and follow its position after resize', () => {
  const h = harness();
  const rail = h.body.children[0];
  assert.equal(rail.style['--pk-folder-left'], '16px');
  assert.equal(rail.style['--pk-folder-top'], '52px');
  h.burger.getBoundingClientRect = () => ({ left: 24, width: 48, height: 48, bottom: 60 });
  h.events.resize();
  assert.equal(rail.style['--pk-folder-left'], '28px');
  assert.equal(rail.style['--pk-folder-top'], '60px');
});

test('a delayed Gmail header is observed only until the burger is available', () => {
  const h = harness('fr', true);
  assert.equal(h.observer.observing, true);
  h.mountHeader();
  assert.equal(h.observer.observing, false);
  assert.equal(h.body.children[0].style['--pk-folder-top'], '52px');
});

test('only icons fade: no white panel, border, shadow, full-height rail or sliding animation', () => {
  const container = css.match(/#pk-no-left-menu-rail\s*\{([^}]+)\}/s)[1];
  assert.match(container, /opacity:\s*0\s*!important/);
  assert.match(container, /transition:\s*opacity 160ms ease/);
  assert.match(container, /background:\s*transparent\s*!important/);
  assert.match(container, /border:\s*0\s*!important/);
  assert.match(container, /box-shadow:\s*none\s*!important/);
  assert.doesNotMatch(container, /bottom:|translate|transition:\s*left/);
  assert.match(css, /#pk-no-left-menu-rail:hover,[\s\S]*?#pk-no-left-menu-rail:has\(a:focus-visible\)\s*\{\s*opacity:\s*1/s);
  assert.doesNotMatch(css, /:focus-within/, 'mouse clicks must not latch the icons open after hover ends');
  assert.match(css, /a:focus-visible\s*\{[^}]*outline:\s*2px/s);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.aeN,[\s\S]*?display:\s*none\s*!important/s);
});

test('the existing NoLeftMenu preference key loads the CSS and rail together', () => {
  const context = vm.createContext({ self: {} });
  vm.runInContext(generated, context);
  const item = context.self.LAB_ITEMS.find((entry) => entry.id === 'css-no-left-menu');
  assert.equal(extensionManifest.version, '2026.11.6');
  assert.equal(item.type, 'js');
  assert.equal(item.file, 'themes/studio/no-left-menu.js');
  assert.deepEqual(Array.from(item.css), ['tweaks/no-left-menu.css']);
  assert.equal(item.world, 'ISOLATED');
  assert.equal(item.runAt, 'document_end');
});
