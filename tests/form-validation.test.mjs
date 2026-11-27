import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('form observer reaches idle and updates only changed disabled state', () => {
  let disabled = false;
  let writes = 0;
  let observer;
  let busy = null;
  let valid = false;
  const queue = [];
  const events = new Map();
  const submit = {
    get disabled() {
      return disabled;
    },
    set disabled(value) {
      disabled = value;
      writes += 1;
      if (observer) queue.push(observer);
    },
  };
  const field = {
    disabled: false,
    get validity() {
      return { valid };
    },
    addEventListener() {},
  };
  const form = {
    querySelector: () => submit,
    querySelectorAll: () => [field],
    getAttribute: () => busy,
    addEventListener: (name, fn) => events.set(name, fn),
  };
  let source = readFileSync(
    new URL('../src/scripts/components/form-validation.ts', import.meta.url),
    'utf8',
  );
  source = source.replace(
    'export function initFormValidation(): void',
    'function initFormValidation()',
  );
  source = source.replace(/\.querySelectorAll<[\s\S]*?>\(/g, '.querySelectorAll(');
  source = source.replace(/\.querySelector<[\s\S]*?>\(/g, '.querySelector(');
  const sandbox = {
    document: { querySelectorAll: () => [form] },
    HTMLInputElement: class {},
    MutationObserver: class {
      constructor(fn) {
        observer = fn;
      }
      observe() {}
    },
    queueMicrotask: (fn) => queue.push(fn),
  };
  const flush = () => {
    let turns = 0;
    while (queue.length) {
      assert.ok(++turns < 20, 'MutationObserver did not reach idle');
      queue.shift()();
    }
  };
  runInNewContext(source + '\ninitFormValidation();', sandbox);
  flush();
  assert.equal(disabled, true);
  assert.equal(writes, 1);
  valid = true;
  events.get('input')();
  flush();
  assert.equal(disabled, false);
  assert.equal(writes, 2);
  busy = 'true';
  observer();
  flush();
  assert.equal(disabled, true);
  busy = 'false';
  observer();
  flush();
  assert.equal(disabled, false);
  assert.equal(writes, 4);
});
