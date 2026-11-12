import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('the reviewed highlighter source survives regeneration unchanged', () => {
  const root = new URL('../../src/extension-pk/', import.meta.url);
  const source = readFileSync(new URL('sources/pk-gmail-keyword-highlighter.user.js', root), 'utf8');
  const built = readFileSync(new URL('scripts/pk-gmail-keyword-highlighter.user.js', root), 'utf8');
  assert.equal(built, source);
  const self = {};
  vm.runInNewContext(readFileSync(new URL('data/manifest.js', root), 'utf8'), { self });
  assert.equal(self.LAB_ITEMS.find(item => item.id === 'js-keyword-highlighter').version, '0.4.1');
});
