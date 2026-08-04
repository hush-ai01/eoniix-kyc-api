import test from 'node:test';
import assert from 'node:assert/strict';
import { determineThreshold } from '../services/arcService.js';

test('amount exactly at threshold (R5000) is full', () => {
  assert.equal(determineThreshold(5000), 'full');
});

test('amount one rand below threshold (R4999) is reduced', () => {
  assert.equal(determineThreshold(4999), 'reduced');
});

test('amount one cent below threshold (R4999.99) is reduced', () => {
  assert.equal(determineThreshold(4999.99), 'reduced');
});

test('amount one cent above threshold (R5000.01) is full', () => {
  assert.equal(determineThreshold(5000.01), 'full');
});

test('amount well below threshold (R100) is reduced', () => {
  assert.equal(determineThreshold(100), 'reduced');
});

test('amount well above threshold (R50000) is full', () => {
  assert.equal(determineThreshold(50000), 'full');
});

test('zero amount is reduced', () => {
  assert.equal(determineThreshold(0), 'reduced');
});

test('negative amount is reduced (defensive — should not occur in practice)', () => {
  assert.equal(determineThreshold(-100), 'reduced');
});

test('very large amount is full', () => {
  assert.equal(determineThreshold(999999999), 'full');
});

test('non-numeric string coerced by >= comparison', () => {
  const result = determineThreshold('5000');
  assert.equal(result, 'full', 'string "5000" is coerced and passes — flag if amountZar should be strictly numeric');
});
