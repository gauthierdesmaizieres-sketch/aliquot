// node plan.test.mjs
import assert from 'node:assert/strict';
import { reactionPostes, posteLabel, runningByPoste } from './plan-data.js';

assert.deepEqual(reactionPostes().map((p) => p.id), ['alle', 'wej', 'bafm', 'mya', 'nal', 'deg', 'lehrlinge']);
assert.equal(posteLabel('mya'), 'Mya');
assert.equal(posteLabel(''), '');

const r = (id, poste, status) => ({ id, poste, status });
assert.deepEqual(
  runningByPoste([r(1, 'alle', 'running'), r(2, 'alle', 'done'), r(3, 'mya', 'running'), r(4, '', 'running'), r(5, 'mya', 'running')]),
  { alle: [r(1, 'alle', 'running')], mya: [r(3, 'mya', 'running'), r(5, 'mya', 'running')] },
);
assert.deepEqual(runningByPoste([]), {});
console.log('plan ok');
