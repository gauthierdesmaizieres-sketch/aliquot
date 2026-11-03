import assert from 'node:assert/strict';
import { parseGhs, hazardKeys } from './pubchem.js';

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

const same = (codes, keys) => assert.deepEqual(hazardKeys(codes).sort(), keys.sort(), codes.join(','));
same(['H225', 'H319', 'H336'], ['flammable', 'irritant']); // acétone
same(['H351', 'H315', 'H319', 'H336'], ['health', 'irritant']); // dichlorométhane
same(['H260', 'H301', 'H314', 'H360'], ['flammable', 'toxic', 'corrosive', 'health']); // NaBH4
same(['H272', 'H290', 'H400', 'H280', 'H201'], ['oxidizer', 'corrosive', 'environment', 'gas', 'explosive']);
same(['H999'], []);
console.log('pubchem ok');
