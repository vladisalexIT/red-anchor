import test from 'node:test';
import assert from 'node:assert/strict';
import { getOpeningState } from '../src/scripts/lib/hero-timeline.js';
test('opening is monotonic, bounded, continuous and reversible', () => {
  for (const width of [1024, 1440, 1920, 2560]) {
    const shift = width * 0.32;
    let previous = getOpeningState(0, 2200, width, shift);
    assert.equal(previous.cover, 0);
    for (let distance = 1; distance <= 2200; distance++) {
      const state = getOpeningState(distance, 2200, width, shift);
      assert.ok(state.shift >= previous.shift);
      assert.ok(state.cover >= previous.cover && state.cover <= 1);
      assert.ok(state.cover - previous.cover < 0.003);
      assert.ok(state.lead >= 0);
      assert.deepEqual(state, getOpeningState(distance, 2200, width, shift));
      previous = state;
    }
    assert.equal(previous.cover, 1);
    assert.equal(previous.shift, shift);
  }
});
test('out of range input clamps to endpoints', () => {
  assert.equal(getOpeningState(-100, 2200, 1920, 600).cover, 0);
  assert.equal(getOpeningState(9999, 2200, 1920, 600).cover, 1);
});
