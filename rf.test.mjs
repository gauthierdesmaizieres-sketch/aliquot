// node labphoto/rf.test.mjs
import assert from 'node:assert/strict';
import { rf, tlcValues } from './rf.js';

assert.equal(rf(0.9, 0.1, 0.5), 0.5);
assert.equal(rf(0.9, 0.1, 0.9), 0);
assert.equal(rf(0.9, 0.1, 0.1), 1);
assert.equal(rf(0.1, 0.9, 0.5), null, 'front sous la ligne de dépôt');
assert.equal(rf(0.5, 0.5, 0.5), null, 'lignes confondues');
assert.equal(rf(0.9, 0.1, 0.05), null, 'tache au-delà du front');
assert.deepEqual(tlcValues({ base: { y: 0.8 }, front: { y: 0.2 }, spots: [{ y: 0.5 }, { y: 0.05 }] }), [0.5]);
assert.deepEqual(tlcValues({ base: { y: 0.8 }, spots: [{ y: 0.5 }] }), []);
assert.deepEqual(tlcValues(null), []);
console.log('rf ok');
