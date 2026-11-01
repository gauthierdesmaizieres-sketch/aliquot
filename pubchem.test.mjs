import assert from 'node:assert/strict';
import { parseGhs } from './pubchem.js';

const sample = {
  Record: { Section: [{ Information: [{ Value: { StringWithMarkup: [
    { String: 'H225: Highly Flammable liquid and vapor [Danger Flammable liquids]' },
    { String: 'H319 (37.7%): Causes serious eye irritation [Warning Serious eye damage]' },
    { String: 'H225 (> 99.9%): Highly Flammable liquid and vapor [Danger]' },
    { String: 'P210: Keep away from heat' },
  ] } }] }] },
};
assert.deepEqual(parseGhs(sample), [
  { code: 'H225', text: 'Highly Flammable liquid and vapor' },
  { code: 'H319', text: 'Causes serious eye irritation' },
]);
assert.deepEqual(parseGhs({}), []);
